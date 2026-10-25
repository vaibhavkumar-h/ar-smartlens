"use client"

import { useEffect, useRef, useState } from "react"
import { PaddleOCR } from "@paddleocr/paddleocr-js"
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision"
import SmartLens3D from "./SmartLens3D"

type SpeechRecognitionAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export default function SmartLensControlCenter() {
  /* =======================================================
     CAMERA STATE
  ======================================================= */

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraMirrored, setCameraMirrored] = useState(false)
  const [cameraError, setCameraError] = useState("")

  const ocrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  // PaddleOCR instances are cached per selected source language.
  // The browser SDK runs the PP-OCR pipeline locally instead of using the
  // older Tesseract recognition engine.
  const paddleOcrRef = useRef<Map<string, any>>(new Map())

  // Multimodal hand-gesture detection
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const gestureAnimationRef = useRef<number | null>(null)
  const lastGestureFrameRef = useRef(0)
  const previousWristXRef = useRef<number | null>(null)
  const waveMovementRef = useRef<number[]>([])
  const waveDirectionRef = useRef<number[]>([])
  const lastGestureTimeRef = useRef(0)

  const [ocrText, setOcrText] = useState("")
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState("")
  const [ocrLanguage, setOcrLanguage] = useState("eng")
  const [ocrTargetLanguage, setOcrTargetLanguage] = useState("hi")
  const [ocrDetectedLanguage, setOcrDetectedLanguage] = useState("")
  const [ocrTranslation, setOcrTranslation] = useState("")
  const [ocrTranslationLoading, setOcrTranslationLoading] = useState(false)
  const [ocrTranslationError, setOcrTranslationError] = useState("")

  const [gestureText, setGestureText] = useState("")
  const [gestureSummary, setGestureSummary] = useState("")
  const [gestureLoading, setGestureLoading] = useState(false)
  const [gestureError, setGestureError] = useState("")
  const [gestureType, setGestureType] = useState("")
  const [signLanguageText, setSignLanguageText] = useState("")
  const [, setSignLanguageType] = useState("")
  const [signLanguageOn, setSignLanguageOn] = useState(false)

  const [micOn, setMicOn] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [micError, setMicError] = useState("")
  const [transcript, setTranscript] = useState("")
  const [speechLanguage, setSpeechLanguage] = useState("auto")
  const [detectedSpeechLanguage, setDetectedSpeechLanguage] = useState("")

  const [targetLanguage, setTargetLanguage] = useState("hi")
  const [translation, setTranslation] = useState("")
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [summary, setSummary] = useState("")
  const [summaryLoading, setSummaryLoading] = useState(false)

  /* =======================================================
     SMART SUMMARY
  ======================================================= */

  /* =======================================================
     SMART CONTEXT / SUMMARY ENGINE
     Local-first semantic analysis for the Expo PoC.
     It combines OCR + translation + voice + gesture and explains
     common signs/text instead of merely repeating the detection.
  ======================================================= */

  const explainDetectedText = (input: string, translated = "") => {
    const raw = input.replace(/\s+/g, " ").trim()
    const text = raw.toLowerCase()
    const translatedText = translated.replace(/\s+/g, " ").trim().toLowerCase()

    if (!raw) return null

    const rules: Array<{
      patterns: string[]
      category: string
      meaning: string
      action: string
    }> = [
      {
        patterns: ["hello", "hi", "hey", "नमस्ते", "হ্যালো", "こんにちは", "안녕하세요", "你好"],
        category: "Greeting",
        meaning: "This is a greeting used to start or acknowledge a conversation.",
        action: "No safety action is required; it is a social greeting.",
      },
      {
        patterns: ["thank you", "thanks", "धन्यवाद", "ধন্যবাদ", "ありがとう", "感謝", "谢谢", "감사합니다"],
        category: "Courtesy",
        meaning: "This expresses thanks or gratitude.",
        action: "Usually indicates appreciation or a polite response.",
      },
      {
        patterns: ["stop", "रुकें", "रुको", "থামুন", "থামো", "止まれ", "停止", "정지"],
        category: "Stop / Safety",
        meaning: "The text instructs a person to stop or not continue.",
        action: "Pause movement and check the surrounding situation before proceeding.",
      },
      {
        patterns: ["warning", "caution", "सावधान", "সতর্কতা", "注意", "경고"],
        category: "Warning",
        meaning: "This indicates a potential hazard or something that needs attention.",
        action: "Slow down and inspect the surrounding area for the associated hazard.",
      },
      {
        patterns: ["danger", "खतरा", "বিপদ", "危険", "危险", "위험"],
        category: "Danger",
        meaning: "This indicates a hazardous or potentially unsafe area or condition.",
        action: "Avoid the hazard and follow the nearby safety instructions.",
      },
      {
        patterns: ["no smoking", "धूम्रपान निषेध", "ধূমপান নিষেধ", "禁煙", "禁止吸烟", "금연"],
        category: "Prohibition",
        meaning: "Smoking is not permitted in this area.",
        action: "Do not smoke here and follow the site's safety rules.",
      },
      {
        patterns: ["exit", "निकास", "প্রস্থান", "出口", "出ロ", "출구"],
        category: "Direction / Exit",
        meaning: "This indicates an exit or a route leading out of an area.",
        action: "Follow the marked direction when you need to leave or evacuate.",
      },
      {
        patterns: ["emergency", "आपातकाल", "জরুরি", "緊急", "紧急", "비상"],
        category: "Emergency",
        meaning: "This relates to an emergency procedure, facility, or route.",
        action: "Follow the site's emergency instructions and seek the indicated assistance.",
      },
      {
        patterns: ["restroom", "toilet", "washroom", "शौचालय", "শৌচাগার", "トイレ", "卫生间", "화장실"],
        category: "Facility",
        meaning: "This identifies a restroom or toilet facility.",
        action: "Use the indicated direction or location to find the facility.",
      },
      {
        patterns: ["hospital", "अस्पताल", "হাসপাতাল", "病院", "医院", "병원"],
        category: "Medical Facility",
        meaning: "This identifies a hospital or medical facility.",
        action: "Follow the indicated direction if medical assistance is needed.",
      },
      {
        patterns: ["fire exit", "fire extinguisher", "अग्नि निकास", "消火器", "消防"],
        category: "Fire Safety",
        meaning: "This refers to fire-safety equipment or an emergency escape route.",
        action: "Follow the marked fire-safety route or use equipment only as instructed.",
      },
      {
        patterns: ["parking", "पार्किंग", "পার্কিং", "駐車", "停车", "주차"],
        category: "Location / Parking",
        meaning: "This indicates a parking area or parking-related instruction.",
        action: "Follow the displayed parking direction and restrictions.",
      },
      {
        patterns: ["cute", "可愛い", "かわいい", "귀여운", "可爱", "प्यारा", "সুন্দর"],
        category: "Description",
        meaning: "This describes something as cute, charming, or visually appealing.",
        action: "No safety action is implied; it is a descriptive expression.",
      },
    ]

    const match = rules.find((rule) =>
      rule.patterns.some((pattern) => text.includes(pattern.toLowerCase()) || translatedText.includes(pattern.toLowerCase())),
    )

    if (match) return match

    return {
      category: "Detected Text",
      meaning: translated
        ? `The camera detected “${raw}”. Its translated output is “${translated}”.`
        : `The camera detected readable text: “${raw}”.`,
      action: "SmartLens can translate the text and use it as visual context.",
    }
  }

  const createLocalSummary = (input: string) => {
    const clean = input
      .replace(/\s+/g, " ")
      .replace(/\b(uh|um|erm|actually|basically|you know|i mean|okay|ok|sorry)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (!clean) return ""

    const lower = clean.toLowerCase()

    // Strong, useful summaries for common SmartLens demo/education scenarios.
    // These are semantic rules, not a transcript dump.
    if (
      /\b(dsa|data structures?|algorithms?|binary search|tree|graph|stack|queue|linked list|sorting)\b/i.test(lower) &&
      /\b(oops?|object oriented|wrapper class|encapsulation|inheritance|polymorphism|abstraction)\b/i.test(lower)
    ) {
      const wrapperFocus =
        /\b(wrapper class|wrapper classes|primitive)\b/i.test(lower)

      return wrapperFocus
        ? "The speaker is discussing DSA and OOP, with a focus on wrapper classes and how objects can be converted to primitive values."
        : "The speaker is discussing core DSA and OOP concepts."
    }

    if (/\b(wrapper class|wrapper classes|autoboxing|unboxing|primitive)\b/i.test(lower)) {
      return "The speaker is discussing wrapper classes in Java, including their relationship with primitive data types and object conversion."
    }

    if (/\b(interview|placement|job preparation|coding interview)\b/i.test(lower)) {
      const topics = []
      if (/\bdsa|data structures?|algorithms?\b/i.test(lower)) topics.push("DSA")
      if (/\boops?|object oriented\b/i.test(lower)) topics.push("OOP")
      if (/\bjava\b/i.test(lower)) topics.push("Java")
      if (/\bc\+\+\b/i.test(lower)) topics.push("C++")
      if (/\bpython\b/i.test(lower)) topics.push("Python")

      return topics.length
        ? `The speaker is preparing for an interview, focusing on ${topics.join(", ")}.`
        : "The speaker is discussing interview preparation."
    }

    // Extract explicit questions separately.
    const questionPatterns = [
      /\bhow are you(?: doing)?\b/i,
      /\bwhat should i learn(?: first)?\b/i,
      /\bwhat should i\b[^,.!?]*/i,
      /\bwhat is\b[^,.!?]*/i,
      /\bwhat are\b[^,.!?]*/i,
      /\bwhere is\b[^,.!?]*/i,
      /\bwhere are\b[^,.!?]*/i,
      /\bwhen is\b[^,.!?]*/i,
      /\bwhy is\b[^,.!?]*/i,
      /\bwhy are\b[^,.!?]*/i,
      /\bwho is\b[^,.!?]*/i,
      /\bcan you\b[^,.!?]*/i,
      /\bcould you\b[^,.!?]*/i,
      /\bdo you\b[^,.!?]*/i,
      /\bare you\b[^,.!?]*/i,
    ]

    const questions: string[] = []
    let remaining = clean

    for (const pattern of questionPatterns) {
      const match = remaining.match(pattern)
      if (!match?.[0]) continue

      const question = match[0]
        .replace(/[.!?]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()

      if (
        question.length >= 5 &&
        !questions.some((q) => q.toLowerCase() === question.toLowerCase())
      ) {
        questions.push(question)
      }

      remaining = remaining.replace(match[0], " ")
    }

    // Remove conversational filler/repeated phrases.
    remaining = remaining
      .replace(/\b(\w+)(\s+\1\b)+/gi, "$1")
      .replace(/\s+/g, " ")
      .trim()

    const parts: string[] = []

    if (questions.length) {
      parts.push(
        `Questions\n${questions
          .slice(0, 3)
          .map(
            (question) =>
              `• ${question.charAt(0).toUpperCase()}${question.slice(1)}?`,
          )
          .join("\n")}`,
      )
    }

    // If speech has real punctuation, select the most informative sentences.
    const sentences = remaining
      .split(/(?<=[.!?।])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)

    if (sentences.length > 1) {
      const stopWords = new Set([
        "the", "a", "an", "and", "or", "but", "to", "of", "in", "on",
        "for", "with", "is", "are", "was", "were", "i", "you", "we",
        "they", "it", "this", "that", "have", "has", "had", "do",
        "does", "did", "hai", "hain", "ka", "ki", "ke", "aur", "ye",
        "woh", "है", "और", "का", "की", "के", "में", "यह", "वह",
      ])

      const scored = sentences.map((sentence, index) => {
        const words = sentence
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, "")
          .split(/\s+/)
          .filter(Boolean)

        return {
          sentence,
          index,
          score: words.filter((word) => !stopWords.has(word)).length,
        }
      })

      const selected = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .sort((a, b) => a.index - b.index)
        .map((item) => item.sentence)
        .join(" ")

      if (selected) parts.push(`Summary\n${selected}`)
    } else if (remaining) {
      // No punctuation is common with browser speech recognition.
      // Keep only the useful beginning and turn it into a concise statement.
      const words = remaining.split(/\s+/).filter(Boolean)
      const compact = words.slice(0, 28).join(" ")

      if (words.length > 28) {
        parts.push(`Summary\n${compact}…`)
      } else {
        parts.push(`Summary\n${remaining}`)
      }
    }

    if (!parts.length) {
      return clean.length > 180
        ? `Summary\n${clean.split(/\s+/).slice(0, 28).join(" ")}…`
        : `Summary\n${clean}`
    }

    return parts.join("\n\n")
  }

  const generateSummary = async () => {
    const sourceText = transcript.trim()
    const detectedGesture = gestureSummary.trim()
    const detectedOcr = ocrText.trim()
    const translatedOcr = ocrTranslation.trim()
    const translatedSpeech = translation.trim()

    if (!sourceText && !detectedGesture && !detectedOcr && !translatedSpeech) {
      setSummary("")
      return
    }

    setSummaryLoading(true)

    // Small delay makes the processing state visible in the live dashboard.
    await new Promise((resolve) => window.setTimeout(resolve, 220))

    const sections: string[] = []

    if (detectedOcr) {
      const visualMeaning = explainDetectedText(detectedOcr, translatedOcr)

      sections.push(`VISUAL
Detected: ${detectedOcr}${translatedOcr ? `\nTranslation: ${translatedOcr}` : ""}`)

      if (visualMeaning) {
        sections.push(`MEANING
Type: ${visualMeaning.category}
${visualMeaning.meaning}`)

        sections.push(`GUIDANCE
${visualMeaning.action}`)
      }
    }

    if (sourceText) {
      const voiceSummary = createLocalSummary(sourceText)

      sections.push(`VOICE CONTEXT
${voiceSummary || sourceText}`)

      if (translatedSpeech) {
        sections.push(`TRANSLATION
${translatedSpeech}`)
      }
    }

    if (detectedGesture) {
      sections.push(`GESTURE
${detectedGesture}`)
    }

    const activeSignals = [
      detectedOcr && "Vision/OCR",
      sourceText && "Voice",
      detectedGesture && "Gesture",
      (translatedOcr || translatedSpeech) && "Translation",
    ].filter(Boolean)

    if (activeSignals.length > 1) {
      sections.push(
        `MULTIMODAL CONTEXT
SmartLens combined ${activeSignals.join(", ")} to build the current context.`,
      )
    }

    const combined = [...new Set(sections)]
      .join("\n\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    setSummary(
      combined ||
        createLocalSummary(sourceText) ||
        detectedGesture ||
        detectedOcr,
    )
    setSummaryLoading(false)
  }

  useEffect(() => {
    if (!transcript.trim() && !gestureSummary.trim() && !ocrText.trim() && !translation.trim()) {
      setSummary("")
      return
    }

    const timer = window.setTimeout(() => {
      void generateSummary()
    }, 700)

    return () => window.clearTimeout(timer)
  }, [transcript, gestureSummary, ocrText, ocrTranslation, translation])

  /* =======================================================
     TRANSLATION + TEXT TO SPEECH
  ======================================================= */

  const languageName: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    bn: "Bengali",
    mr: "Marathi",
    te: "Telugu",
    ta: "Tamil",
    gu: "Gujarati",
    kn: "Kannada",
    ml: "Malayalam",
    pa: "Punjabi",
    or: "Odia",
    as: "Assamese",
    ur: "Urdu",
    ne: "Nepali",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
    fr: "French",
    de: "German",
    es: "Spanish",
  }

  const detectSpokenLanguage = (text: string) => {
    const value = text.trim()
    if (!value) return ""

    // Script-first detection is reliable when the speech engine returns
    // native-script text.
    if (/[\u0980-\u09FF]/.test(value)) return "bn"
    if (/[\u0900-\u097F]/.test(value)) return "hi"
    if (/[\u0A00-\u0A7F]/.test(value)) return "pa"
    if (/[\u0B80-\u0BFF]/.test(value)) return "ta"
    if (/[\u0C00-\u0C7F]/.test(value)) return "te"
    if (/[\u0C80-\u0CFF]/.test(value)) return "kn"
    if (/[\u0D00-\u0D7F]/.test(value)) return "ml"
    if (/[\u0A80-\u0AFF]/.test(value)) return "gu"
    if (/[\u0B00-\u0B7F]/.test(value)) return "or"
    if (/[\u0600-\u06FF]/.test(value)) return "ur"
    if (/[\u3040-\u30FF]/.test(value)) return "ja"
    if (/[\uAC00-\uD7AF]/.test(value)) return "ko"
    if (/[\u4E00-\u9FFF]/.test(value)) return "zh"

    // Browser speech recognition can sometimes romanize Indian speech.
    // Score common words instead of treating every Latin transcript as English.
    const words = value.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter(Boolean)
    const scores: Record<string, number> = {
      bn: 0, hi: 0, pa: 0, mr: 0, te: 0, ta: 0, gu: 0, kn: 0, ml: 0,
      en: 0, es: 0, fr: 0, de: 0, ja: 0, ko: 0, zh: 0,
    }

    const profiles: Record<string, string[]> = {
      bn: ["ami", "tumi", "tomake", "bhalobashi", "bhalo", "amar", "onek", "kothay", "ache", "apni", "keno", "korbo", "ki"],
      hi: ["main", "mujhe", "tum", "aap", "kya", "hai", "hoon", "nahi", "karna", "chahiye", "mera", "meri", "bahut", "kaise"],
      pa: ["tusi", "mainu", "tuhanu", "kive", "kiven", "kithe", "haan", "ji", "sanu", "mera"],
      mr: ["mala", "tula", "tumhi", "ahe", "nahi", "kay", "kasa", "kashi", "majha", "khup"],
      te: ["nenu", "meeru", "naku", "neeku", "ela", "undi", "unnaru", "chala", "manchi"],
      ta: ["naan", "neenga", "ungalukku", "enakku", "enna", "epdi", "irukku", "romba", "nalla"],
      gu: ["mane", "tame", "tamne", "shu", "kem", "chhe", "che", "bahu", "maru"],
      kn: ["nanu", "neevu", "nanage", "nimge", "enu", "hege", "ide", "tumba", "chennagide"],
      ml: ["njan", "ningal", "enikku", "ningalkku", "entha", "engane", "anu", "valare", "nalla"],
      ja: ["arigato", "arigatou", "konnichiwa", "ohayo", "ohayou", "sayonara", "sumimasen", "hai", "watashi", "anata", "desu", "kudasai", "nani", "doko"],
      ko: ["annyeong", "annyeonghaseyo", "gamsahamnida", "kamsahamnida", "saranghae", "ne", "aniyo", "eotteoke", "mwo"],
      zh: ["nihao", "ninhao", "xiexie", "zaijian", "wo", "ni", "shénme", "shenme", "zai", "hao"],
      es: ["hola", "como", "donde", "quiero", "puedes", "gracias", "para", "esto", "buenos", "dias", "necesito"],
      fr: ["bonjour", "comment", "ou", "merci", "je", "vous", "avec", "pour", "salut", "aime"],
      de: ["hallo", "wie", "wo", "danke", "ich", "nicht", "bitte", "und", "guten", "tag"],
    }

    for (const [language, profile] of Object.entries(profiles)) {
      for (const word of words) {
        if (profile.includes(word)) scores[language] += 1
      }
    }

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const [bestLanguage, bestScore] = ranked[0] || ["", 0]
    const secondScore = ranked[1]?.[1] || 0

    // Require a small confidence margin so ordinary English isn't
    // accidentally relabeled as an Indian language.
    if (bestScore >= 2 && bestScore > secondScore) return bestLanguage
    return "en"
  }

  const speechToTranslationCode = (value: string) => {
    if (value === "auto") return detectedSpeechLanguage || "en"
    if (value.startsWith("bn")) return "bn"
    if (value.startsWith("hi")) return "hi"
    if (value.startsWith("pa")) return "pa"
    if (value.startsWith("mr")) return "mr"
    if (value.startsWith("te")) return "te"
    if (value.startsWith("ta")) return "ta"
    if (value.startsWith("gu")) return "gu"
    if (value.startsWith("kn")) return "kn"
    if (value.startsWith("ml")) return "ml"
    if (value.startsWith("or")) return "or"
    if (value.startsWith("ur")) return "ur"
    if (value.startsWith("ne")) return "ne"
    if (value.startsWith("es")) return "es"
    if (value.startsWith("fr")) return "fr"
    if (value.startsWith("de")) return "de"
    if (value.startsWith("zh")) return "zh"
    if (value.startsWith("ja")) return "ja"
    if (value.startsWith("ko")) return "ko"
    return "en"
  }

  const detectedLanguageLabel = (code: string) =>
    languageName[code] || code.toUpperCase()

  const translateText = async (
    textToTranslate: string,
    sourceLanguage = speechToTranslationCode(speechLanguage),
    destinationLanguage = targetLanguage,
  ) => {
    const cleanText = textToTranslate.trim()

    if (!cleanText) {
      setTranslation("")
      return
    }

    if (sourceLanguage === destinationLanguage) {
      setTranslation(cleanText)
      return
    }

    setTranslationLoading(true)
    setTranslationError("")

    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 8000)

      const url =
        `https://api.mymemory.translated.net/get?` +
        `q=${encodeURIComponent(cleanText)}` +
        `&langpair=${encodeURIComponent(
          `${sourceLanguage}|${destinationLanguage}`,
        )}`

      const response = await fetch(url, {
        signal: controller.signal,
      })

      window.clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`Translation request failed: ${response.status}`)
      }

      const data = await response.json()
      const translated = data?.responseData?.translatedText?.trim()

      if (!translated) {
        throw new Error("No translated text was returned.")
      }

      setTranslation(translated)
    } catch (error) {
      console.error("Translation error:", error)
      setTranslationError("Translation service is unavailable right now.")
    } finally {
      setTranslationLoading(false)
    }
  }

  const speakTranslation = () => {
    if (!translation || !("speechSynthesis" in window)) return

    window.speechSynthesis.cancel()

    const voiceLanguageMap: Record<string, string> = {
      en: "en-US",
      hi: "hi-IN",
      pa: "pa-IN",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
    }

    const utterance = new SpeechSynthesisUtterance(translation)
    utterance.lang = voiceLanguageMap[targetLanguage] || "en-US"
    utterance.rate = 0.95
    utterance.pitch = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    const cleanTranscript = transcript.trim()

    if (!cleanTranscript) {
      setTranslation("")
      setTranslationError("")
      return
    }

    const timer = window.setTimeout(() => {
      void translateText(cleanTranscript)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [transcript, speechLanguage, detectedSpeechLanguage, targetLanguage])

  /* =======================================================
     MICROPHONE + SPEECH INPUT
  ======================================================= */

  const stopMicrophone = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    audioStreamRef.current?.getTracks().forEach((track) => {
      track.stop()
    })

    audioStreamRef.current = null

    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setMicLevel(0)
    setMicOn(false)
  }

  const startSpeechRecognition = () => {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!Recognition) {
      setMicError(
        "Live speech recognition is not supported in this browser."
      )
      return
    }

    const recognition = new Recognition()

    recognition.lang = speechLanguage === "auto" ? "en-IN" : speechLanguage
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let text = ""

      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }

      const cleanText = text.trim()
      setTranscript(cleanText)

      if (speechLanguage === "auto" && cleanText) {
        const detected = detectSpokenLanguage(cleanText)
        setDetectedSpeechLanguage(detected)
      } else {
        setDetectedSpeechLanguage(speechToTranslationCode(speechLanguage))
      }
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event)
      setMicError("Speech recognition could not process the audio.")
    }

    recognition.onend = () => {
      if (micOn && recognitionRef.current === recognition) {
        try {
          recognition.start()
        } catch {
          // Browser may reject a restart while transitioning.
        }
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (error) {
      console.error("Speech recognition start error:", error)
      setMicError("Could not start speech recognition.")
    }
  }

  const startMicrophone = async () => {
    try {
      setMicError("")

      if (!navigator.mediaDevices?.getUserMedia) {
        setMicError(
          "Microphone access is not supported by this browser."
        )
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      audioStreamRef.current = stream

      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext

      if (!AudioContextClass) {
        setMicError("Audio analysis is not supported in this browser.")
        stopMicrophone()
        return
      }

      const audioContext = new AudioContextClass()

      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.75

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      setMicOn(true)

      const data = new Uint8Array(analyser.fftSize)

      const updateLevel = () => {
        const currentAnalyser = analyserRef.current

        if (!currentAnalyser) {
          return
        }

        currentAnalyser.getByteTimeDomainData(data)

        let sum = 0

        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128
          sum += normalized * normalized
        }

        const rms = Math.sqrt(sum / data.length)
        const level = Math.min(100, Math.round(rms * 220))

        setMicLevel(level)

        animationFrameRef.current =
          requestAnimationFrame(updateLevel)
      }

      animationFrameRef.current =
        requestAnimationFrame(updateLevel)

      startSpeechRecognition()
    } catch (error) {
      console.error("Microphone error:", error)

      setMicError(
        "Microphone permission was denied or the microphone is unavailable."
      )

      setMicOn(false)
    }
  }

  const toggleMicrophone = async () => {
    if (micOn) {
      stopMicrophone()
    } else {
      await startMicrophone()
    }
  }

  /* =======================================================
     HAND GESTURE DETECTION
  ======================================================= */

  const initializeHandLandmarker = async () => {
    if (handLandmarkerRef.current) return handLandmarkerRef.current

    try {
      setGestureLoading(true)
      setGestureError("")

      // IMPORTANT: keep the WASM runtime aligned with the installed
      // @mediapipe/tasks-vision package. The previous code pinned 0.10.22,
      // which can fail when npm has installed a newer package version.
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      )

      const modelAssetPath =
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

      // CPU is more reliable across Chrome/Windows hardware. If that fails,
      // retry with GPU before reporting an error.
      let landmarker: HandLandmarker

      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        })
      } catch (cpuError) {
        console.warn("CPU hand tracking initialization failed, retrying GPU:", cpuError)
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        })
      }

      handLandmarkerRef.current = landmarker
      setGestureLoading(false)
      return landmarker
    } catch (error) {
      console.error("Hand tracking initialization failed:", error)
      setGestureLoading(false)
      const detail = error instanceof Error ? error.message : String(error)
      setGestureError(`Gesture model failed to load: ${detail.slice(0, 90)}`)
      return null
    }
  }

  const classifyHandGesture = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return ""

    const wrist = landmarks[0]
    const fingerPairs = [
      [8, 6],   // index
      [12, 10], // middle
      [16, 14], // ring
      [20, 18], // pinky
    ]

    const distance = (a: any, b: any) =>
      Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))

    // A finger is extended when its tip is clearly farther from the wrist
    // than its PIP joint. This works well for front-facing webcam gestures.
    const extended = fingerPairs.map(([tip, pip]) =>
      distance(landmarks[tip], wrist) > distance(landmarks[pip], wrist) * 1.10,
    )

    const thumbExtended =
      distance(landmarks[4], wrist) > distance(landmarks[3], wrist) * 1.08

    const [index, middle, ring, pinky] = extended
    const openCount = extended.filter(Boolean).length

    if (thumbExtended && !index && !middle && !ring && !pinky) {
      // Thumb-up is stronger when the thumb tip is above the wrist.
      if (landmarks[4].y < wrist.y + 0.08) return "thumbs_up"
    }

    if (index && middle && !ring && !pinky) return "victory"
    if (index && !middle && !ring && !pinky) return "pointing"
    if (openCount >= 4 && thumbExtended) return "open_palm"
    if (openCount === 0 && !thumbExtended) return "fist"

    return ""
  }

  /* =======================================================
     SIGN LANGUAGE POC — ASL STATIC SIGNS
     MediaPipe Hand Landmarker gives us hand landmarks. This
     lightweight browser POC recognizes a small set of static
     ASL-inspired hand shapes. Full sign-language translation
     requires a temporal sign-language model/dataset.
  ======================================================= */

  const classifySignLanguage = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return ""

    const wrist = landmarks[0]
    const distance = (a: any, b: any) =>
      Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))

    const fingerPairs = [
      [8, 6],   // index
      [12, 10], // middle
      [16, 14], // ring
      [20, 18], // pinky
    ]

    const extended = fingerPairs.map(([tip, pip]) =>
      distance(landmarks[tip], wrist) > distance(landmarks[pip], wrist) * 1.10,
    )

    const [index, middle, ring, pinky] = extended

    const thumbExtended =
      distance(landmarks[4], wrist) > distance(landmarks[3], wrist) * 1.08

    // ASL-inspired static "I LOVE YOU":
    // thumb + index + pinky extended, middle + ring folded.
    if (thumbExtended && index && !middle && !ring && pinky) {
      return "asl_ily"
    }

    // ASL-inspired "L": index + thumb extended.
    if (thumbExtended && index && !middle && !ring && !pinky) {
      return "asl_l"
    }

    // ASL-inspired "Y": thumb + pinky extended.
    if (thumbExtended && !index && !middle && !ring && pinky) {
      return "asl_y"
    }

    // ASL-inspired "V": index + middle extended.
    if (index && middle && !ring && !pinky) {
      return "asl_v"
    }

    return ""
  }

  const emitSignLanguage = (type: string) => {
    const signs: Record<string, { text: string; meaning: string }> = {
      asl_ily: {
        text: "🤟 ASL: I LOVE YOU",
        meaning: "Static ASL-style I LOVE YOU handshape detected.",
      },
      asl_l: {
        text: "🤟 ASL: L",
        meaning: "Static ASL-style L handshape detected.",
      },
      asl_y: {
        text: "🤙 ASL: Y",
        meaning: "Static ASL-style Y handshape detected.",
      },
      asl_v: {
        text: "✌️ ASL: V",
        meaning: "Static ASL-style V handshape detected.",
      },
    }

    const sign = signs[type]
    if (!sign) return

    setSignLanguageType(type)
    setSignLanguageText(`${sign.text} · ${sign.meaning}`)
    setGestureSummary(sign.meaning)
  }

  const emitGesture = (type: string) => {
    const messages: Record<string, { text: string; summary: string }> = {
      wave: {
        text: "👋 Hello detected",
        summary: "SmartLens detected a hand wave, indicating a greeting.",
      },
      thumbs_up: {
        text: "👍 Thumbs up detected",
        summary: "SmartLens detected a thumbs-up gesture, indicating a positive signal.",
      },
      open_palm: {
        text: "✋ Open palm detected",
        summary: "SmartLens detected an open-palm hand gesture.",
      },
      pointing: {
        text: "☝️ Pointing detected",
        summary: "SmartLens detected a pointing gesture, indicating a selected direction or object.",
      },
      victory: {
        text: "✌️ Two-finger gesture detected",
        summary: "SmartLens detected a two-finger gesture.",
      },
      fist: {
        text: "✊ Fist detected",
        summary: "SmartLens detected a closed-fist gesture.",
      },
    }

    const message = messages[type]
    if (!message) return

    setGestureType(type)
    setGestureText(message.text)
    setGestureSummary(message.summary)

    if (type === "wave") {
      setSignLanguageText("")
      setSignLanguageType("")
    }

    window.setTimeout(() => setGestureText(""), 5000)
  }

  const detectHandGesture = () => {
    const video = videoRef.current
    const landmarker = handLandmarkerRef.current

    if (!video || !landmarker || video.readyState < 2) return

    // Keep inference around ~12 FPS so the webcam/UI stays responsive.
    const now = performance.now()
    if (now - lastGestureFrameRef.current < 80) return
    lastGestureFrameRef.current = now

    try {
      const result = landmarker.detectForVideo(video, performance.now())

      if (!result.landmarks.length) {
        previousWristXRef.current = null
        waveMovementRef.current = []
        waveDirectionRef.current = []
        return
      }

      const landmarks = result.landmarks[0]
      const wrist = landmarks?.[0]
      if (!wrist) return

      const currentX = wrist.x
      const handType = classifyHandGesture(landmarks)
      const signType = classifySignLanguage(landmarks)

      // Count extended fingers independently of the generic classifier.
      // This makes wave detection tolerant when a moving hand briefly gets
      // classified as another gesture (e.g. thumbs-up/open-palm).
      const distance = (a: any, b: any) =>
        Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))

      const fingerPairs = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
      ]

      const extendedCount = fingerPairs.filter(([tip, pip]) =>
        distance(landmarks[tip], wrist) >
        distance(landmarks[pip], wrist) * 1.08,
      ).length

      const thumbExtended =
        distance(landmarks[4], wrist) >
        distance(landmarks[3], wrist) * 1.06

      const openHandLike = thumbExtended && extendedCount >= 3

      // Static sign-language POC is evaluated separately from dynamic wave
      // detection. A sign is emitted only after a short cooldown.
      if (
        signLanguageOn &&
        signType &&
        Date.now() - lastGestureTimeRef.current > 2200
      ) {
        lastGestureTimeRef.current = Date.now()
        emitSignLanguage(signType)
      }

      if (previousWristXRef.current !== null) {
        const deltaX = currentX - previousWristXRef.current
        const movement = Math.abs(deltaX)

        if (movement > 0.008) {
          waveMovementRef.current.push(movement)
          waveDirectionRef.current.push(Math.sign(deltaX))
        }

        if (waveMovementRef.current.length > 30) {
          waveMovementRef.current.shift()
          waveDirectionRef.current.shift()
        }

        const totalMovement = waveMovementRef.current.reduce(
          (sum, value) => sum + value,
          0,
        )

        // Count genuine left/right reversals. A simple hand translation
        // should not trigger a wave.
        let reversals = 0
        for (let i = 1; i < waveDirectionRef.current.length; i += 1) {
          const previous = waveDirectionRef.current[i - 1]
          const current = waveDirectionRef.current[i]

          if (
            previous !== 0 &&
            current !== 0 &&
            previous !== current
          ) {
            reversals += 1
          }
        }

        // More forgiving than the old detector:
        // - accepts an open-looking hand even if the classifier flickers
        // - works with slower waves
        // - needs several direction changes, so moving across the frame
        //   is still not interpreted as "Hello".
        const enoughMovement =
          openHandLike &&
          waveMovementRef.current.length >= 5 &&
          totalMovement > 0.16 &&
          reversals >= 2

        const enoughTime =
          Date.now() - lastGestureTimeRef.current > 1800

        if (enoughMovement && enoughTime) {
          lastGestureTimeRef.current = Date.now()
          emitGesture("wave")
          waveMovementRef.current = []
          waveDirectionRef.current = []
          previousWristXRef.current = currentX
          return
        }
      }

      // A moving open hand gets a small grace period so "wave" has time to
      // win before the UI reports a plain open-palm gesture.
      const movementInProgress =
        waveMovementRef.current.length >= 2 &&
        waveMovementRef.current.reduce((sum, value) => sum + value, 0) > 0.04

      const enoughTime =
        Date.now() - lastGestureTimeRef.current > 2600

      if (
        handType &&
        enoughTime &&
        !(handType === "open_palm" && movementInProgress)
      ) {
        lastGestureTimeRef.current = Date.now()
        emitGesture(handType)
      }

      previousWristXRef.current = currentX
    } catch (error) {
      console.warn("Gesture detection frame failed:", error)
    }
  }

  useEffect(() => {
    if (!signLanguageOn) {
      setSignLanguageText("")
      setSignLanguageType("")
    }
  }, [signLanguageOn])

  const startGestureDetection = async () => {
    const landmarker = await initializeHandLandmarker()
    if (!landmarker || !cameraOn) return

    if (gestureAnimationRef.current !== null) {
      cancelAnimationFrame(gestureAnimationRef.current)
    }

    const loop = () => {
      if (!cameraOn || !videoRef.current) {
        gestureAnimationRef.current = null
        return
      }

      detectHandGesture()
      gestureAnimationRef.current = requestAnimationFrame(loop)
    }

    gestureAnimationRef.current = requestAnimationFrame(loop)
  }

  const stopGestureDetection = () => {
    if (gestureAnimationRef.current !== null) {
      cancelAnimationFrame(gestureAnimationRef.current)
      gestureAnimationRef.current = null
    }

    previousWristXRef.current = null
    waveMovementRef.current = []
    waveDirectionRef.current = []
    lastGestureFrameRef.current = 0
  }

  /* =======================================================
     CAMERA VISION — PADDLEOCR
  ======================================================= */

  // UI language value -> PaddleOCR language/model value.
  // PP-OCRv5 supports the Indian and international languages used by
  // SmartLens, including Hindi, Marathi, Telugu, Tamil and Japanese.
  const paddleOcrLanguage: Record<string, string> = {
    eng: "en",
    hin: "hi",
    ben: "bn",
    mar: "mr",
    tel: "te",
    tam: "ta",
    guj: "gu",
    kan: "ka",
    mal: "ml",
    pan: "pa",
    ori: "or",
    asm: "as",
    urd: "ur",
    nep: "ne",
    jpn: "japan",
    chi_sim: "ch",
    kor: "korean",
    fra: "fr",
    deu: "de",
    spa: "es",
  }

  const ocrTranslationCode: Record<string, string> = {
    eng: "en",
    hin: "hi",
    ben: "bn",
    mar: "mr",
    tel: "te",
    tam: "ta",
    guj: "gu",
    kan: "kn",
    mal: "ml",
    pan: "pa",
    ori: "or",
    asm: "as",
    urd: "ur",
    nep: "ne",
    jpn: "ja",
    chi_sim: "zh",
    kor: "ko",
    fra: "fr",
    deu: "de",
    spa: "es",
  }

  const getPaddleOcr = async (uiLanguage: string) => {
    const lang = paddleOcrLanguage[uiLanguage] || "en"
    const cached = paddleOcrRef.current.get(lang)

    if (cached) return cached

    // PP-OCRv5 is a detection + recognition pipeline, so it finds text
    // regions itself instead of requiring us to guess a crop/PSM mode.
    const ocr = await PaddleOCR.create({
      lang,
      ocrVersion: "PP-OCRv5",
      worker: true,
      ortOptions: {
        backend: "auto",
      },
    })

    paddleOcrRef.current.set(lang, ocr)
    return ocr
  }

  const translateOcrResult = async (text: string, sourceLanguage: string) => {
    const cleanText = text.trim()
    if (!cleanText) return

    setOcrTranslationLoading(true)
    setOcrTranslationError("")

    try {
      if (sourceLanguage === ocrTargetLanguage) {
        setOcrTranslation(cleanText)
        return
      }

      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10000)

      const url =
        `https://api.mymemory.translated.net/get?` +
        `q=${encodeURIComponent(cleanText)}` +
        `&langpair=${encodeURIComponent(`${sourceLanguage}|${ocrTargetLanguage}`)}`

      const response = await fetch(url, { signal: controller.signal })
      window.clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`OCR translation failed: ${response.status}`)
      }

      const data = await response.json()
      const translated = data?.responseData?.translatedText?.trim()

      if (!translated) throw new Error("No OCR translation returned.")

      setOcrTranslation(translated)
    } catch (error) {
      console.error("OCR translation error:", error)
      setOcrTranslation("")
      setOcrTranslationError("Text detected, but translation is unavailable right now.")
    } finally {
      setOcrTranslationLoading(false)
    }
  }

  const enhanceOcrFrame = (source: HTMLVideoElement) => {
    const canvas = document.createElement("canvas")
    const scale = 2
    canvas.width = Math.round(source.videoWidth * scale)
    canvas.height = Math.round(source.videoHeight * scale)

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return canvas

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = image.data

    // Gentle contrast/sharpness preparation. We deliberately do NOT hard
    // threshold the image because that can destroy thin glyphs and scripts.
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      const value = Math.max(0, Math.min(255, (gray - 128) * 1.22 + 128))
      pixels[i] = value
      pixels[i + 1] = value
      pixels[i + 2] = value
    }

    ctx.putImageData(image, 0, 0)
    return canvas
  }

  const extractPaddleText = (result: any) => {
    type OcrItem = {
      text: string
      score: number
      x: number
      y: number
    }

    const items = Array.isArray(result?.items) ? result.items : []

    const cleaned: OcrItem[] = items
      .map((item: any, index: number) => {
        let text = String(item?.text ?? "")
          .replace(/[\r\n]+/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim()

        // Drop common camera/background OCR noise without destroying real
        // words. This mainly targets isolated watermark-like tokens such as
        // "123RF" or "19.6hm" that appear around the actual sign/text.
        const digitCount = (text.match(/[0-9]/g) || []).length
        const letterCount = (text.match(/[\p{L}]/gu) || []).length
        const looksLikeNumericNoise =
          digitCount >= 2 && digitCount >= Math.max(2, letterCount)
        if (looksLikeNumericNoise) text = ""

        const score = Number(item?.score ?? 0)
        const poly = Array.isArray(item?.poly) ? item.poly : []
        const xs = poly.map((p: any) => Number(p?.[0] ?? 0))
        const ys = poly.map((p: any) => Number(p?.[1] ?? 0))

        return {
          text,
          score,
          x: xs.length ? Math.min(...xs) : index,
          y: ys.length ? Math.min(...ys) : index,
        }
      })
      .filter((item: OcrItem) => item.text.length >= 1 && item.score >= 0.32)
      .sort((a: OcrItem, b: OcrItem) => a.y - b.y || a.x - b.x)

    if (!cleaned.length) {
      return { text: "", confidence: 0, count: 0 }
    }

    // Preserve line breaks when detected boxes are vertically separated.
    const lines: Array<{ y: number; parts: OcrItem[] }> = []

    for (const item of cleaned) {
      const last = lines[lines.length - 1]
      if (!last || Math.abs(item.y - last.y) > 34) {
        lines.push({ y: item.y, parts: [item] })
      } else {
        last.parts.push(item)
      }
    }

    const text = lines
      .map((line) => line.parts.map((part) => part.text).join(" "))
      .join("\n")
      .trim()

    const confidence =
      cleaned.reduce((sum: number, item: any) => sum + item.score, 0) /
      cleaned.length

    return { text, confidence, count: cleaned.length }
  }

  const captureOcrRoi = (source: HTMLVideoElement) => {
    const sourceWidth = source.videoWidth
    const sourceHeight = source.videoHeight

    // Center scan window: large enough for a handheld sign, but small enough
    // to avoid browser chrome, posters, watermarks and surrounding objects.
    const roiWidthRatio = 0.82
    const roiHeightRatio = 0.72
    const cropWidth = Math.round(sourceWidth * roiWidthRatio)
    const cropHeight = Math.round(sourceHeight * roiHeightRatio)
    const cropX = Math.round((sourceWidth - cropWidth) / 2)
    const cropY = Math.round((sourceHeight - cropHeight) / 2)
    const scale = 2

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(cropWidth * scale)
    canvas.height = Math.round(cropHeight * scale)

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) throw new Error("Could not create OCR canvas.")

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    return canvas
  }

  const normalizeOcrForComparison = (text: string) =>
    text
      .toLowerCase()
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()

  const sleepForOcrFrame = (ms: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const scanCameraText = async () => {
    if (!cameraOn || !videoRef.current) {
      setOcrError("Turn the camera ON before scanning.")
      return
    }

    setOcrLoading(true)
    setOcrError("")
    setOcrTranslationError("")

    try {
      const video = videoRef.current

      if (video.videoWidth < 10 || video.videoHeight < 10) {
        throw new Error("Camera frame is not ready yet.")
      }

      const sourceLanguage = ocrTranslationCode[ocrLanguage] || "en"
      const paddle = await getPaddleOcr(ocrLanguage)

      const runPaddle = async (image: HTMLCanvasElement) => {
        const [result] = await paddle.predict(image, {
          textDetLimitSideLen: 1536,
          textDetLimitType: "max",
          textRecScoreThresh: 0.32,
        })
        return extractPaddleText(result)
      }

      // Scan three nearby frames. A real text line is normally stable across
      // frames while reflections/noise and tiny background detections vary.
      const results: Array<{ text: string; confidence: number; count: number }> = []

      for (let frame = 0; frame < 3; frame += 1) {
        const roiCanvas = captureOcrRoi(video)
        const result = await runPaddle(roiCanvas)
        results.push(result)

        if (frame < 2) await sleepForOcrFrame(140)
      }

      // Prefer repeated OCR output, then confidence, then useful text length.
      const frequency = new Map<string, number>()
      for (const result of results) {
        const key = normalizeOcrForComparison(result.text)
        if (key) frequency.set(key, (frequency.get(key) || 0) + 1)
      }

      let best = results[0] || { text: "", confidence: 0, count: 0 }
      let bestScore = -1

      for (const result of results) {
        const key = normalizeOcrForComparison(result.text)
        const repeatBonus = (frequency.get(key) || 0) * 0.35
        const qualityScore =
          repeatBonus +
          result.confidence * 0.55 +
          Math.min(result.text.length, 80) / 800 +
          Math.min(result.count, 8) / 100

        if (qualityScore > bestScore) {
          bestScore = qualityScore
          best = result
        }
      }

      // If all three frames are weak, run one enhanced ROI retry.
      if (!best.text || best.confidence < 0.45) {
        const enhancedFull = enhanceOcrFrame(video)
        const enhancedResult = await runPaddle(enhancedFull)
        if (
          enhancedResult.confidence > best.confidence ||
          (enhancedResult.text.length > best.text.length && best.confidence < 0.4)
        ) {
          best = enhancedResult
        }
      }

      console.log("SmartLens PaddleOCR multi-frame:", { results, best })

      const cleanCharacters = (best.text.match(/[\p{L}\p{N}]/gu) || []).length
      const accepted =
        best.text.length >= 2 &&
        cleanCharacters >= 2 &&
        best.count > 0 &&
        best.confidence >= 0.20

      if (!accepted) {
        setOcrText("")
        setOcrTranslation("")
        setOcrDetectedLanguage("")
        setOcrError(
          "No reliable text detected. Keep the text inside the scan box, move closer and use good lighting.",
        )
      } else {
        setOcrText(best.text)
        setOcrError("")
        setOcrDetectedLanguage(sourceLanguage.toUpperCase())
        await translateOcrResult(best.text, sourceLanguage)
      }

      ocrCanvasRef.current = captureOcrRoi(video)
    } catch (error) {
      console.error("PaddleOCR error:", error)
      setOcrText("")
      setOcrTranslation("")
      setOcrDetectedLanguage("")
      setOcrError(
        error instanceof Error
          ? error.message
          : "OCR failed. Please try again with clearer text.",
      )
    } finally {
      setOcrLoading(false)
    }
  }

  const clearVisionResult = () => {
    setOcrText("")
    setOcrTranslation("")
    setOcrTranslationError("")
    setOcrDetectedLanguage("")
    setOcrError("")
    setGestureText("")
    setGestureSummary("")
    setGestureError("")
    setGestureType("")
  }

  /* =======================================================
     CAMERA
  ======================================================= */

  const startCamera = async () => {
    try {
      setCameraError("")

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported by this browser.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          facingMode: "environment",
        },
        audio: false,
      })

      // Ask cameras that support it to keep text/object focus continuous.
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          })
        } catch {
          // focusMode is not supported by every browser/camera.
        }
      }

      streamRef.current = stream
      setCameraOn(true)
    } catch (error) {
      console.error("Camera error:", error)

      setCameraError(
        "Camera permission was denied or the camera is unavailable."
      )

      setCameraOn(false)
    }
  }

  const stopCamera = () => {
    stopGestureDetection()

    streamRef.current?.getTracks().forEach((track) => {
      track.stop()
    })

    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    setCameraOn(false)
    setGestureText("")
    setGestureSummary("")
  }

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera()
    } else {
      await startCamera()
    }
  }

  /* -----------------------------------------------
     ATTACH STREAM AFTER VIDEO ELEMENT RENDERS
  ----------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current

    if (!video || !stream || !cameraOn) {
      return
    }

    video.srcObject = stream

    const playVideo = async () => {
      try {
        await video.play()
      } catch (error) {
        console.error("Video playback error:", error)
      }
    }

    if (video.readyState >= 1) {
      void playVideo()
    } else {
      video.onloadedmetadata = () => {
        void playVideo()
      }
    }

    return () => {
      video.onloadedmetadata = null
    }
  }, [cameraOn])

  useEffect(() => {
    if (!cameraOn) {
      stopGestureDetection()
      return
    }

    const timer = window.setTimeout(() => {
      void startGestureDetection()
    }, 700)

    return () => {
      window.clearTimeout(timer)
      stopGestureDetection()
    }
  }, [cameraOn])

  /* -----------------------------------------------
     CLEAN CAMERA WHEN PAGE CLOSES
  ----------------------------------------------- */

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop()
      })

      streamRef.current = null

      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      audioStreamRef.current?.getTracks().forEach((track) => {
        track.stop()
      })

      audioStreamRef.current = null

      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }

      audioContextRef.current = null

      // PaddleOCR owns its Web Worker instances. Clear our language cache
      // when the dashboard unmounts so a new dashboard starts cleanly.
      paddleOcrRef.current.clear()

      if (gestureAnimationRef.current !== null) {
        cancelAnimationFrame(gestureAnimationRef.current)
        gestureAnimationRef.current = null
      }

      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close()
        handLandmarkerRef.current = null
      }
    }
  }, [])

  const arOverlayText =
    (signLanguageOn ? signLanguageText : "") ||
    gestureText ||
    ocrTranslation ||
    translation ||
    ocrText ||
    transcript ||
    "Waiting for SmartLens output..."

  const arSource =
    ocrText && ocrTranslation
      ? speechToTranslationCode(ocrLanguage).toUpperCase()
      : speechToTranslationCode(speechLanguage).toUpperCase()

  const arTarget =
    ocrText && ocrTranslation
      ? ocrTranslationCode[ocrTargetLanguage]?.toUpperCase() || ocrTargetLanguage.toUpperCase()
      : targetLanguage.toUpperCase()

  const multimodalSources = [
    { label: "VISION", active: Boolean(cameraOn) },
    { label: "OCR", active: Boolean(ocrText) },
    { label: "GESTURE", active: Boolean(gestureSummary) },
    { label: "VOICE", active: Boolean(transcript) },
    { label: "TRANSLATION", active: Boolean(translation || ocrTranslation) },
  ]

  const multimodalCount = multimodalSources.filter((item) => item.active).length

  return (
    <main className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 overflow-x-hidden bg-[#030505] text-white">

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="flex h-20 items-center justify-between border-b border-white/10 px-6 lg:px-10">

        <div>
          <div className="text-sm font-semibold tracking-[0.2em]">
            SMARTLENS
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-white/35">
            Multimodal Communication System
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs">

          <span className="h-2 w-2 rounded-full bg-green-400" />

          DEVICE CONNECTED

        </div>

      </header>


      {/* =================================================
          DASHBOARD
      ================================================= */}

      <section className="grid min-h-[calc(100vh-80px)] grid-cols-1 lg:grid-cols-[340px_minmax(520px,1fr)_340px]">


        {/* =================================================
            LEFT — INPUT CONTROLS
        ================================================= */}

        <aside className="border-r border-white/10 p-6 lg:p-7">

          <div className="mb-6">

            <h2 className="text-lg font-semibold">
              INPUT CONTROLS
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Control what SmartLens listens to,
              sees and processes.
            </p>

          </div>


          <div className="space-y-3">


            {/* =================================================
                MICROPHONE
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <div>
                  <span className="text-sm">
                    Microphone
                  </span>

                  <p className="mt-1 text-xs text-white/40">
                    Speech + audio input
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleMicrophone}
                  className={`rounded-full px-3 py-1 text-[10px] transition-all ${
                    micOn
                      ? "bg-green-400/20 text-green-300"
                      : "bg-white/10 text-white/45 hover:bg-white/15"
                  }`}
                >
                  {micOn ? "LIVE" : "OFF"}
                </button>

              </div>

              <div className="mt-4 flex h-12 items-center gap-1">

                {Array.from({ length: 30 }).map((_, i) => {
                  const wave =
                    micOn
                      ? Math.max(
                          5,
                          Math.min(
                            42,
                            5 +
                              micLevel * (
                                0.25 +
                                Math.abs(
                                  Math.sin(i * 0.85)
                                ) * 0.55
                              )
                          )
                        )
                      : 5

                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-[height] duration-75 ${
                        micOn
                          ? "bg-green-300"
                          : "bg-white/25"
                      }`}
                      style={{
                        height: `${wave}px`,
                      }}
                    />
                  )
                })}

              </div>

              {micOn && (
                <div className="mt-2 flex items-center justify-between text-[9px] text-white/35">
                  <span>
                    INPUT LEVEL
                  </span>

                  <span>
                    {micLevel}%
                  </span>
                </div>
              )}

              {micError && (
                <p className="mt-2 text-[10px] leading-4 text-red-400">
                  {micError}
                </p>
              )}

            </div>


            {/* =================================================
                CAMERA — REAL CAMERA
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <div>

                  <span className="text-sm">
                    Camera
                  </span>

                  <p className="mt-1 text-xs text-white/40">
                    Outward camera • Vision + OCR
                  </p>

                </div>


                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`rounded-full px-3 py-1 text-[10px] transition-all ${
                    cameraOn
                      ? "bg-green-400/20 text-green-300"
                      : "bg-white/10 text-white/45 hover:bg-white/15"
                  }`}
                >
                  {cameraOn ? "LIVE" : "OFF"}
                </button>

              </div>


              {/* CAMERA PREVIEW */}

              <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-black">

                {cameraOn ? (

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    onClick={() => setCameraMirrored((value) => !value)}
                    title="Click to switch mirror / unmirror"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer object-cover transition-transform duration-300"
                    style={{ transform: cameraMirrored ? "scaleX(-1)" : "scaleX(1)" }}
                  />

                ) : (

                  <div className="flex h-full items-center justify-center">

                    <div className="text-center">

                      <div className="text-xs text-white/30">
                        Camera is off
                      </div>

                      <div className="mt-1 text-[10px] text-white/20">
                        Click LIVE to activate
                      </div>

                    </div>

                  </div>

                )}


                {/* LIVE INDICATOR */}

                {cameraOn && (

                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-2.5 py-1 text-[9px] backdrop-blur">

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />

                    LIVE

                  </div>

                )}


                {cameraOn && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="relative h-[72%] w-[82%] rounded-xl border border-cyan-300/55 bg-cyan-300/[0.025] shadow-[0_0_35px_rgba(103,232,249,0.08)]">
                      <span className="absolute -top-5 left-0 text-[8px] uppercase tracking-[0.2em] text-cyan-200/70">
                        OCR SCAN AREA
                      </span>
                      <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-cyan-200" />
                      <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-cyan-200" />
                      <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-cyan-200" />
                      <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-cyan-200" />
                      {ocrLoading && (
                        <div className="absolute inset-x-0 top-1/2 h-px animate-pulse bg-cyan-300/60 shadow-[0_0_12px_rgba(103,232,249,0.65)]" />
                      )}
                    </div>
                  </div>
                )}

              </div>


              {/* OCR SOURCE + TRANSLATION LANGUAGE */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block px-1 text-[9px] uppercase tracking-[0.16em] text-white/35">
                    Language
                  </label>
                  <select
                    value={ocrLanguage}
                    onChange={(event) => {
                      setOcrLanguage(event.target.value)
                      setOcrText("")
                      setOcrTranslation("")
                      setOcrTranslationError("")
                      setOcrDetectedLanguage("")
                    }}
                    className="w-full rounded-xl border border-white/10 bg-[#090b0b] px-3 py-2.5 text-[10px] text-white/75 outline-none transition hover:border-white/20"
                  >
                    <optgroup label="Indian Languages">
                      <option value="eng">English</option>
                      <option value="hin">Hindi</option>
                      <option value="ben">Bengali</option>
                      <option value="mar">Marathi</option>
                      <option value="tel">Telugu</option>
                      <option value="tam">Tamil</option>
                      <option value="guj">Gujarati</option>
                      <option value="kan">Kannada</option>
                      <option value="mal">Malayalam</option>
                      <option value="pan">Punjabi</option>
                      <option value="ori">Odia</option>
                      <option value="asm">Assamese</option>
                      <option value="urd">Urdu</option>
                      <option value="nep">Nepali</option>
                    </optgroup>
                    <optgroup label="International Languages">
                      <option value="jpn">Japanese</option>
                      <option value="chi_sim">Chinese</option>
                      <option value="kor">Korean</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="spa">Spanish</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block px-1 text-[9px] uppercase tracking-[0.16em] text-white/35">
                    Translate to
                  </label>
                  <select
                    value={ocrTargetLanguage}
                    onChange={(event) => {
                      setOcrTargetLanguage(event.target.value)
                      setOcrTranslation("")
                      setOcrTranslationError("")
                    }}
                    className="w-full rounded-xl border border-white/10 bg-[#090b0b] px-3 py-2.5 text-[10px] text-white/75 outline-none transition hover:border-white/20"
                  >
                    <optgroup label="Indian Languages">
                      <option value="hi">Hindi</option>
                      <option value="en">English</option>
                      <option value="bn">Bengali</option>
                      <option value="mr">Marathi</option>
                      <option value="te">Telugu</option>
                      <option value="ta">Tamil</option>
                      <option value="gu">Gujarati</option>
                      <option value="kn">Kannada</option>
                      <option value="ml">Malayalam</option>
                      <option value="pa">Punjabi</option>
                      <option value="or">Odia</option>
                      <option value="as">Assamese</option>
                      <option value="ur">Urdu</option>
                      <option value="ne">Nepali</option>
                    </optgroup>
                    <optgroup label="International Languages">
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                      <option value="ko">Korean</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">

                <button
                  type="button"
                  onClick={scanCameraText}
                  disabled={!cameraOn || ocrLoading}
                  className={`rounded-xl border px-3 py-2 text-[10px] transition ${
                    cameraOn && !ocrLoading
                      ? "border-green-400/25 bg-green-400/10 text-green-300 hover:bg-green-400/15"
                      : "border-white/10 text-white/25"
                  }`}
                >
                  {ocrLoading ? "SCANNING TEXT..." : "SCAN TEXT / OCR"}
                </button>

                <button
                  type="button"
                  onClick={clearVisionResult}
                  disabled={!ocrText && !ocrError}
                  className="rounded-xl border border-white/10 px-3 py-2 text-[10px] text-white/35 transition hover:text-white/60"
                >
                  CLEAR
                </button>

              </div>

              {ocrText && (
                <div className="mt-3 rounded-xl border border-green-400/20 bg-green-400/[0.04] p-3">

                  <div className="text-[9px] uppercase tracking-[0.18em] text-green-300/60">
                    OCR DETECTED
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/70">
                    {ocrText}
                  </p>

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-300/60">
                      {ocrTranslationLoading
                        ? "TRANSLATING OCR..."
                        : `TRANSLATION → ${languageName[ocrTargetLanguage] || ocrTargetLanguage}`}
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-cyan-100">
                      {ocrTranslation || "Waiting for translation..."}
                    </p>
                    {ocrDetectedLanguage && (
                      <p className="mt-1 text-[9px] text-white/30">
                        Source: {languageName[ocrDetectedLanguage.toLowerCase()] || ocrDetectedLanguage}
                      </p>
                    )}
                    {ocrTranslationError && (
                      <p className="mt-1 text-[9px] leading-4 text-amber-300/70">
                        {ocrTranslationError}
                      </p>
                    )}
                  </div>

                </div>
              )}

              {ocrError && (
                <p className="mt-2 text-[10px] leading-4 text-amber-300/70">
                  {ocrError}
                </p>
              )}

              {gestureText && (
                <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-300/60">
                    GESTURE DETECTED
                  </div>
                  <p className="mt-2 text-xs leading-5 text-cyan-200">
                    {gestureText}
                  </p>
                </div>
              )}

              {gestureLoading && (
                <p className="mt-2 text-[10px] leading-4 text-white/30">
                  Initializing hand tracking...
                </p>
              )}

              {gestureError && (
                <p className="mt-2 text-[10px] leading-4 text-amber-300/70">
                  {gestureError}
                </p>
              )}

              {/* CAMERA ERROR */}

              {cameraError && (

                <p className="mt-2 text-[10px] leading-4 text-red-400">
                  {cameraError}
                </p>

              )}

            </div>


            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                  Hand Gesture Engine
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSignLanguageOn((value) => !value)}
                    disabled={!cameraOn}
                    className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] transition ${
                      signLanguageOn
                        ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
                        : "border-white/10 bg-white/[0.03] text-white/35 hover:bg-white/[0.06]"
                    } ${!cameraOn ? "cursor-not-allowed opacity-40" : ""}`}
                    title={!cameraOn ? "Turn camera on first" : "Toggle sign language detection"}
                  >
                    Sign {signLanguageOn ? "ON" : "OFF"}
                  </button>

                  <span className={`text-[9px] uppercase tracking-[0.16em] ${gestureLoading ? "text-amber-300/70" : gestureError ? "text-red-300/70" : "text-green-300/70"}`}>
                    {gestureLoading ? "LOADING" : gestureError ? "ERROR" : "LIVE"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-white/35">
                Wave · thumbs up · open palm · pointing · victory · fist
              </p>
              {gestureType && (
                <p className="mt-2 text-[10px] text-cyan-200/70">
                  Current: {gestureType.replace(/_/g, " ")}
                </p>
              )}
              <div className="mt-3 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.025] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-cyan-300/60">
                    Sign Language POC
                  </span>
                  <span className={`text-[9px] ${signLanguageOn ? "text-cyan-200/70" : "text-white/25"}`}>
                    {signLanguageOn ? "ASL · ACTIVE" : "ASL · OFF"}
                  </span>
                </div>
                <p className="mt-1 text-[9px] leading-4 text-white/35">
                  Static handshapes: ILY · L · Y · V
                </p>
                {signLanguageText && (
                  <p className="mt-2 text-[10px] leading-4 text-cyan-200">
                    {signLanguageText}
                  </p>
                )}
              </div>
            </div>

            {/* =================================================
                VOICE COMMAND
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <span className="text-sm">
                  Voice Command
                </span>

                <span className="text-[10px] text-white/35">
                  {speechLanguage === "auto"
                    ? detectedSpeechLanguage
                      ? `AUTO · ${detectedLanguageLabel(detectedSpeechLanguage)}`
                      : "AUTO"
                    : languageName[speechToTranslationCode(speechLanguage)]}
                </span>

              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs leading-5 text-white/60">
                {transcript || (
                  <span className="text-white/30">
                    Say something...
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">

                <select
                  value={speechLanguage}
                  onChange={(event) => {
                    const next = event.target.value
                    setSpeechLanguage(next)
                    setDetectedSpeechLanguage(next === "auto" ? "" : speechToTranslationCode(next))
                  }}
                  className="min-w-0 rounded-xl border border-white/10 bg-[#090b0b] px-2 py-2 text-[10px] text-white/70 outline-none"
                >
                  <option value="auto">Auto Detect</option>
                  <optgroup label="Indian Languages">
                    <option value="en-IN">English</option>
                    <option value="bn-IN">Bengali</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="mr-IN">Marathi</option>
                    <option value="te-IN">Telugu</option>
                    <option value="ta-IN">Tamil</option>
                    <option value="gu-IN">Gujarati</option>
                    <option value="kn-IN">Kannada</option>
                    <option value="ml-IN">Malayalam</option>
                    <option value="pa-IN">Punjabi</option>
                    <option value="or-IN">Odia</option>
                    <option value="as-IN">Assamese</option>
                    <option value="ur-IN">Urdu</option>
                    <option value="ne-NP">Nepali</option>
                  </optgroup>
                  <optgroup label="International Languages">
                    <option value="ja-JP">Japanese</option>
                    <option value="zh-CN">Chinese</option>
                    <option value="ko-KR">Korean</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="es-ES">Spanish</option>
                  </optgroup>
                </select>

                <select
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                  className="min-w-0 rounded-xl border border-white/10 bg-[#090b0b] px-2 py-2 text-[10px] text-white/70 outline-none"
                >
                  <optgroup label="Indian Languages">
                    <option value="hi">Hindi</option>
                    <option value="en">English</option>
                    <option value="bn">Bengali</option>
                    <option value="mr">Marathi</option>
                    <option value="te">Telugu</option>
                    <option value="ta">Tamil</option>
                    <option value="gu">Gujarati</option>
                    <option value="kn">Kannada</option>
                    <option value="ml">Malayalam</option>
                    <option value="pa">Punjabi</option>
                    <option value="or">Odia</option>
                    <option value="as">Assamese</option>
                    <option value="ur">Urdu</option>
                    <option value="ne">Nepali</option>
                  </optgroup>
                  <optgroup label="International Languages">
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                    <option value="ko">Korean</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                  </optgroup>
                </select>

              </div>

            </div>

          </div>

        </aside>


        {/* =================================================
            CENTER
        ================================================= */}

        <section className="relative flex min-h-[clamp(620px,calc(100vh-80px),900px)] min-w-0 flex-col items-center justify-start overflow-hidden pt-5 sm:pt-6 lg:pt-7">

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]" />

          <div className="relative z-10 mb-1 w-full max-w-3xl px-4 text-center sm:px-6">
            <h1 className="text-[clamp(1.8rem,3vw,2.25rem)] font-semibold">
              SmartLens
            </h1>

            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/35 sm:text-xs">
              Interactive 3D View
            </p>
          </div>

          <div className="relative z-10 mt-0 w-full min-w-0 px-2 sm:px-4 lg:px-5">
            <SmartLens3D
              arText={
                (signLanguageOn ? signLanguageText : "") ||
                gestureText ||
                ocrTranslation ||
                translation ||
                ocrText ||
                (transcript ? transcript : "")
              }
              summaryText={
                (signLanguageOn ? signLanguageText : "") ||
                gestureSummary ||
                (ocrTranslation ? `Translated text: ${ocrTranslation}` : "") ||
                (ocrText ? `Detected text: ${ocrText}` : "") ||
                (transcript ? createLocalSummary(transcript) : "")
              }
              sourceLanguage={speechToTranslationCode(speechLanguage).toUpperCase()}
              targetLanguage={(ocrTranslation ? ocrTargetLanguage : targetLanguage).toUpperCase()}
            />
          <div className="relative z-10 mt-4 w-full max-w-6xl px-3 pb-6 sm:px-5 lg:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {/* =================================================
                PRIVACY MODE
              ================================================= */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">Privacy Mode</div>
                <span className="text-[10px] text-green-300/70">LOCAL-FIRST</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
                {[
                  ["Camera", cameraOn],
                  ["OCR", Boolean(ocrText)],
                  ["Gesture", Boolean(gestureSummary)],
                  ["Voice", Boolean(transcript)],
                ].map(([label, active]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-lg border border-white/5 px-2.5 py-2">
                    <span className="text-white/45">{label}</span>
                    <span className={active ? "text-green-300/70" : "text-white/25"}>
                      {active ? "LOCAL" : "READY"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[9px] uppercase tracking-[0.14em] text-white/25">
                Cloud upload · OFF
              </div>
            </div>

              {/* =================================================
                CROSS-REALITY
              ================================================= */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">Cross-Reality</div>
                <span className="text-[10px] text-cyan-200/55">XR LINK</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {["REAL → AR", "REAL → VR", "AR → REAL"].map((mode, index) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.08em] transition ${
                      index === 0
                        ? "border-cyan-200/25 bg-cyan-200/10 text-cyan-100"
                        : "border-white/10 text-white/40 hover:border-cyan-200/20 hover:text-white/65"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <p className="mt-2 text-[9px] leading-4 text-white/25">
                VR channel is presented as a proof-of-concept simulation.
              </p>
            </div>

              {/* =================================================
                ACCESSIBILITY
              ================================================= */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">Accessibility</div>
                <span className="text-[10px] text-white/35">OUTPUT</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/5 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-white/50">Visual Captions</div>
                  <div className="mt-1 text-[9px] text-cyan-100/50">Speech → AR text</div>
                </div>
                <div className="rounded-xl border border-white/5 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-white/50">Audio Assist</div>
                  <div className="mt-1 text-[9px] text-cyan-100/50">Text → translated voice</div>
                </div>
              </div>
            </div>

              {/* =================================================
                SYSTEM STATUS
              ================================================= */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">System Status</div>
                <span className="text-[10px] text-green-300/70">ONLINE</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["Camera", cameraOn],
                  ["Microphone", micOn],
                  ["OCR Engine", !ocrError],
                  ["Gesture", !gestureError],
                  ["Translation", Boolean(translation || ocrTranslation)],
                  ["Audio", isSpeaking],
                ].map(([label, active]) => (
                  <div key={String(label)} className="rounded-xl border border-white/5 px-2.5 py-2">
                    <div className="text-[8px] uppercase tracking-[0.12em] text-white/35">{label}</div>
                    <div className={`mt-1 text-[9px] ${active ? "text-green-300/70" : "text-white/25"}`}>
                      ● {active ? "READY" : "STANDBY"}
                    </div>
                  </div>
                ))}
              </div>
            </div>




            {/* =================================================
                MULTIMODAL FUSION
            ================================================= */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">Multimodal Fusion</div>
                <span className="text-[10px] text-cyan-200/55">
                  {multimodalCount > 0 ? `${multimodalCount}/5 ACTIVE` : "WAITING"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {multimodalSources.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border px-2.5 py-2 ${
                      item.active
                        ? "border-cyan-200/20 bg-cyan-200/[0.05]"
                        : "border-white/5 bg-white/[0.015]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-[0.12em] text-white/55">
                        {item.label}
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.active
                            ? "bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,.8)]"
                            : "bg-white/15"
                        }`}
                      />
                    </div>
                    <div className="mt-1 text-[9px] text-white/30">
                      {item.active ? "CONTEXT READY" : "STANDBY"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[9px] uppercase tracking-[0.13em] text-white/35">
                Vision + Audio + Gesture → Context Engine → SmartLens Output
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="text-sm">
                Context
              </div>

              <div className="mt-3 flex flex-wrap gap-2">

                {[
                  "Vision",
                  "OCR",
                  "Gesture",
                  "Translation",
                  "Context",
                ].map((tag) => (

                  <span
                    key={tag}
                    className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/50"
                  >
                    {tag}
                  </span>

                ))}

              </div>

            </div>
            </div>
          </div>

          </div>

        </section>


        {/* =================================================
            RIGHT — LIVE OUTPUT
        ================================================= */}

        <aside className="border-l border-white/10 p-6 lg:p-7">

          <div className="mb-6">

            <h2 className="text-lg font-semibold">
              LIVE OUTPUT
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              What SmartLens sees, hears and understands.
            </p>

          </div>


          <div className="space-y-3">


            {/* =================================================
                AR TEXT
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">
                <span className="text-sm">
                  AR Text
                </span>

                <span className="text-[10px] text-green-300/60">
                  SMARTLENS OUTPUT
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-green-400/40 bg-green-400/[0.04] p-3 text-sm leading-5 text-green-300">

                {gestureText ? (
                  <span>{gestureText}</span>
                ) : ocrLoading ? (
                  <span className="text-white/35">
                    Reading the scene...
                  </span>
                ) : ocrText ? (
                  <span>{ocrText}</span>
                ) : translationLoading ? (
                  <span className="text-white/35">
                    Processing...
                  </span>
                ) : translation ? (
                  translation
                ) : (
                  <span className="text-white/35">
                    Waiting for SmartLens output...
                  </span>
                )}

              </div>

            </div>


            {/* =================================================
                AR OVERLAY
            ================================================= */}
            <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.025] p-4 shadow-[0_0_30px_rgba(103,232,249,0.04)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(165,243,252,.9)]" />
                  AR Overlay
                </div>
                <span className="text-[10px] text-cyan-100/45">
                  {arOverlayText !== "Waiting for SmartLens output..." ? "LIVE" : "READY"}
                </span>
              </div>

              <div className="relative mt-3 min-h-[118px] overflow-hidden rounded-xl border border-cyan-100/10 bg-black/45 px-4 py-4">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(165,243,252,.08),transparent_62%)]" />
                <div className="relative z-10 flex h-full min-h-[86px] flex-col justify-between">
                  <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.16em] text-cyan-100/45">
                    <span>SMARTLENS DISPLAY</span>
                    <span>AR-01</span>
                  </div>

                  <div className="py-2 text-center text-base font-semibold leading-6 text-white drop-shadow-[0_0_12px_rgba(165,243,252,.45)]">
                    {arOverlayText}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[8px] uppercase tracking-[0.14em] text-white/35">
                    <span>{arSource} → {arTarget}</span>
                    <span>{isSpeaking ? "AUDIO ACTIVE" : "VISUAL"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[9px] uppercase tracking-[0.15em] text-cyan-200/45">
                Translation → AR display
              </div>
            </div>


            {/* =================================================
                TRANSLATION
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <span className="text-sm">
                  Translation
                </span>

                <span className="text-xs text-white/40">
                  {speechToTranslationCode(speechLanguage).toUpperCase()}
                  {" → "}
                  {targetLanguage.toUpperCase()}
                </span>

              </div>

              <div className="mt-3 max-h-[300px] min-h-[48px] overflow-y-auto whitespace-pre-line rounded-xl border border-white/5 bg-black/20 p-3 text-sm leading-6 text-white/65">

                {translationLoading ? (
                  <span className="text-white/35">
                    Translating...
                  </span>
                ) : translation ? (
                  translation
                ) : (
                  <span className="text-white/30">
                    Speak into the microphone to translate.
                  </span>
                )}

              </div>

              {translationError && (
                <p className="mt-2 text-[10px] leading-4 text-red-400">
                  {translationError}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">

                <span className="text-[10px] text-white/30">
                  {languageName[targetLanguage] || targetLanguage}
                </span>

                <button
                  type="button"
                  onClick={speakTranslation}
                  disabled={!translation}
                  className={`rounded-full border px-3 py-1.5 text-[10px] transition ${
                    translation
                      ? "border-green-400/30 bg-green-400/10 text-green-300 hover:bg-green-400/20"
                      : "border-white/10 text-white/25"
                  }`}
                >
                  {isSpeaking ? "Speaking..." : "🔊 Play"}
                </button>

              </div>

            </div>


            {/* =================================================
                AUDIO OUTPUT
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <div className="text-sm">
                  Audio Output
                </div>

                <span className="text-[10px] text-white/35">
                  {isSpeaking ? "PLAYING" : "READY"}
                </span>

              </div>

              <div className="mt-4 flex h-8 items-center gap-1">

                {Array.from({ length: 25 }).map((_, i) => (

                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      isSpeaking
                        ? "bg-green-300"
                        : "bg-white/25"
                    }`}
                    style={{
                      height: isSpeaking
                        ? `${8 + ((i * 17) % 25)}px`
                        : "5px",
                    }}
                  />

                ))}

              </div>

            </div>





            {/* =================================================
                CONTEXT
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <div className="text-sm">
                  Vision / OCR
                </div>

                <span className="text-[10px] text-white/35">
                  {ocrLoading ? "SCANNING" : ocrText ? "DETECTED" : "READY"}
                </span>

              </div>

              <p className="mt-3 min-h-[40px] text-sm leading-6 text-white/60">
                {ocrTranslation ? (
                  ocrTranslation
                ) : ocrText ? (
                  ocrText
                ) : (
                  <span className="text-white/30">
                    Point the camera at readable text and scan it.
                  </span>
                )}
              </p>

              {ocrText && (
                <div className="mt-2 text-[9px] uppercase tracking-[0.16em] text-green-300/50">
                  Camera → OCR → SmartLens output
                </div>
              )}

              {gestureSummary && (
                <div className="mt-2 text-[9px] uppercase tracking-[0.16em] text-cyan-300/50">
                  Camera → Gesture → Context
                </div>
              )}

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="flex items-center justify-between">

                <div className="text-sm">
                  Summary
                </div>

                <span className="text-[10px] text-cyan-300/60">
                  {summaryLoading ? "ANALYZING" : "CONTEXT AI"}
                </span>

              </div>

              <div className="mt-3 max-h-[360px] min-h-[48px] overflow-y-auto whitespace-pre-line rounded-xl border border-white/5 bg-black/20 p-3 text-sm leading-6 text-white/65">

                {summaryLoading ? (
                  <span className="text-white/35">
                    Understanding conversation...
                  </span>
                ) : summary ? (
                  summary
                ) : (
                  <span className="text-white/30">
                    Waiting for enough context to summarize...
                  </span>
                )}

              </div>

              {summary && (
                <button
                  type="button"
                  onClick={() => void generateSummary()}
                  className="mt-3 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/55 transition hover:border-green-400/30 hover:text-green-300"
                >
                  Refresh Summary
                </button>
              )}

            </div>




          </div>

        </aside>


      </section>

    </main>
  )
}