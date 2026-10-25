"use client"

import {
  ArrowRight,
  Camera,
  Eye,
  Home,
  Languages,
  Mic,
  Moon,
  ScanText,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Waypoints,
  Waves,
  type LucideIcon,
} from "lucide-react"

import { motion, useReducedMotion } from "motion/react"
import { useState, type CSSProperties } from "react"

import { SonarGrid } from "@/components/ui/sonar-grid"
import { Spotlight } from "@/components/ui/spotlight"
import SmartLensScrollReveal from "./components/SmartLensScrollReveal"
import SmartLensControlCenter from "./components/SmartLensControlCenter"

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const defaultSettings = {
  color: "#FFFFFF",
  speed: 200,
  dotRadius: 1.4,
  ringWidth: 90,
  amplitude: 2.2,
  pingEvery: 2.4,
  interactive: true,
  spacing: 26,
  baseOpacity: 0.28,
}

/* =========================================================
   FEATURES
========================================================= */

const features = [
  {
    icon: Camera,
    title: "VISION",
    text: "Camera-powered scene understanding and visual context.",
  },
  {
    icon: Mic,
    title: "AUDIO",
    text: "Directional audio capture with intelligent noise reduction.",
  },
  {
    icon: Languages,
    title: "TRANSLATION",
    text: "Real-time multilingual speech translation.",
  },
  {
    icon: ScanText,
    title: "OCR",
    text: "Recognize and translate text from the environment.",
  },
  {
    icon: Waypoints,
    title: "SENSOR FUSION",
    text: "Audio, vision and contextual signals working together.",
  },
  {
    icon: Waves,
    title: "CROSS-REALITY",
    text: "Communication between real world, AR and VR.",
  },
]

/* =========================================================
   BENEFITS
========================================================= */

const benefits = [
  {
    title: "Hear what matters",
    text: "Translated speech and contextual audio can be delivered through the SmartLens audio system.",
  },
  {
    title: "See what cannot be heard",
    text: "Spoken communication can be converted into readable information through the visual interface.",
  },
  {
    title: "Understand the environment",
    text: "Camera and OCR capabilities can help interpret visual information around the wearer.",
  },
  {
    title: "Communicate across languages",
    text: "Speech can be processed and translated into another language in real time.",
  },
]

/* =========================================================
   HELPERS
========================================================= */

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "")

  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean

  const number = Number.parseInt(normalized, 16)

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  }
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const reduce = useReducedMotion()

  const [settings, setSettings] = useState(defaultSettings)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  const updateSetting = <
    K extends keyof typeof defaultSettings,
  >(
    key: K,
    value: (typeof defaultSettings)[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const resetSettings = () => {
    setSettings({ ...defaultSettings })
  }

  

  /*
   * IMPORTANT:
   *
   * Default accent is WHITE.
   * White works beautifully in dark mode.
   * In light mode white would disappear,
   * so we automatically use a dark neutral accent.
   *
   * If the user chooses another color from Controls,
   * that exact color is used.
   */

  const isDefaultWhite = settings.color.toUpperCase() === "#FFFFFF"

  const displayAccent =
    isDefaultWhite && !darkMode
      ? "#111111"
      : settings.color

  const displayRgb = hexToRgb(displayAccent)

  const accentStyle = {
    "--smart-accent": displayAccent,
    "--smart-accent-rgb": `${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}`,
  } as CSSProperties

  /* =======================================================
     THEME
  ======================================================= */

  const pageBackground = darkMode
    ? "bg-[#030505] text-white"
    : "bg-[#f7f7f5] text-[#111111]"

  const secondaryText = darkMode
    ? "rgba(255,255,255,0.62)"
    : "rgba(0,0,0,0.68)"

  /* =======================================================
     ANIMATION
  ======================================================= */

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: {
            opacity: 0,
            y: 18,
            filter: "blur(7px)",
          },

          animate: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          },

          transition: {
            duration: 0.7,
            delay,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    })
  }

  const openSmartLens = () => {
    window.location.href = "/lens"
  }

  const openOrder = () => {
    scrollTo("order")
  }

  /* =======================================================
     LENS DASHBOARD ENTRY
     ONLY ADDED: keeps the existing front page unchanged.
  ======================================================= */

  if (window.location.pathname === "/lens") {
    return (
      <>
        <Spotlight fill="white" />
        <SmartLensControlCenter />
      </>
    )
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <>
      <Spotlight fill="white" />

      <main
        id="top"
      style={accentStyle}
      className={`relative left-1/2 m-0 min-h-screen w-screen max-w-none -translate-x-1/2 p-0 transition-colors duration-500 ${pageBackground}`}
    >

      {/* =====================================================
          HERO / SONAR
      ===================================================== */}

      {/* =====================================================
          FULL-BLEED HERO
          The main element is already viewport width, so the
          sonar no longer needs another left-1/2 escape wrapper.
      ===================================================== */}

      <div className="relative w-full max-w-none">

        <SonarGrid
          id="smartlens-hero"

          ringWidth={settings.ringWidth}
          speed={settings.speed}
          amplitude={settings.amplitude}
          pingEvery={settings.pingEvery}
          interactive={settings.interactive}
          spacing={settings.spacing}
          dotRadius={settings.dotRadius}
          baseOpacity={settings.baseOpacity}

          /*
            IMPORTANT:
            Use displayAccent rather than hardcoded cyan.
          */
          color={displayAccent}

          pingArea={[0.12, 0.12, 0.88, 0.88]}

          className={`relative m-0 flex min-h-screen w-full max-w-none flex-col ${
            darkMode ? "bg-[#030505]" : "bg-[#f7f7f5]"
          }`}
        >

          {/* =================================================
              BACKGROUND GLOW
          ================================================= */}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(
                ellipse 42% 38% at 50% 45%,
                rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, ${
                  darkMode ? "0.06" : "0.035"
                }),
                transparent 70%
              )`,
            }}
          />

          {/* =================================================
              TOP NAVIGATION
          ================================================= */}

          <nav className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">

            {/* LOGO */}

            <motion.button
              {...enter(0)}
              type="button"
              onClick={() => scrollTo("top")}
              className="group flex items-center gap-3"
            >

              <div
                className={`flex size-9 items-center justify-center rounded-xl border backdrop-blur transition-all ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-black/10 bg-white/70"
                }`}
              >
                <Eye
                  className="size-4"
                  style={{ color: displayAccent }}
                />
              </div>

              <div className="text-left">

                <div
                  className="text-sm font-semibold tracking-[0.18em]"
                  style={{
                    color: darkMode ? "#FFFFFF" : "#111111",
                  }}
                >
                  SMARTLENS
                </div>

                <div
                  className="hidden text-[9px] uppercase tracking-[0.25em] sm:block"
                  style={{
                    color: darkMode
                      ? "rgba(255,255,255,0.42)"
                      : "rgba(0,0,0,0.45)",
                  }}
                >
                  Multimodal Communication
                </div>

              </div>
            </motion.button>

            {/* =================================================
                DESKTOP NAV
            ================================================= */}

            <div
              className={`hidden items-center gap-1 rounded-full border p-1 backdrop-blur-xl md:flex ${
                darkMode
                  ? "border-white/10 bg-black/45"
                  : "border-black/10 bg-white/85"
              }`}
            >

              <NavButton
                icon={Home}
                label="Home"
                darkMode={darkMode}
                onClick={() => scrollTo("top")}
              />

              <NavButton
                icon={Eye}
                label="Lens"
                darkMode={darkMode}
                onClick={openSmartLens}
              />

              <NavButton
                icon={ShoppingBag}
                label="Order"
                darkMode={darkMode}
                onClick={openOrder}
              />

              <NavButton
                icon={Settings}
                label="Controls"
                darkMode={darkMode}
                active={controlsOpen}
                onClick={() =>
                  setControlsOpen((current) => !current)
                }
              />

            </div>

            {/* =================================================
                RIGHT CONTROLS
            ================================================= */}

            <div className="flex items-center gap-2">

              {/* THEME BUTTON */}

              <button
                type="button"
                onClick={() =>
                  setDarkMode((current) => !current)
                }
                aria-label="Toggle light and dark mode"
                className={`flex size-9 items-center justify-center rounded-full border backdrop-blur transition-all ${
                  darkMode
                    ? "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    : "border-black/10 bg-white text-black hover:bg-black/[0.04]"
                }`}
              >
                {darkMode ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </button>

              {/* SYSTEM STATUS */}

              <div
                className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] backdrop-blur sm:flex sm:px-4 sm:py-2 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-black/10 bg-white/80"
                }`}
                style={{
                  color: darkMode
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.65)",
                }}
              >

                <span
                  className="size-1.5 animate-pulse rounded-full"
                  style={{
                    backgroundColor: displayAccent,
                    boxShadow: `0 0 10px ${displayAccent}`,
                  }}
                />

                System Online

              </div>

            </div>
          </nav>

          {/* =================================================
              MOBILE NAV
          ================================================= */}

          <div
            className="fixed left-1/2 top-[78px] z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full border p-1 backdrop-blur-xl md:hidden"
            style={{
              borderColor: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",

              backgroundColor: darkMode
                ? "rgba(0,0,0,0.3)"
                : "rgba(255,255,255,0.8)",
            }}
          >

            <MobileNavButton
              icon={Home}
              darkMode={darkMode}
              onClick={() => scrollTo("top")}
            />

            <MobileNavButton
              icon={Eye}
              darkMode={darkMode}
              onClick={openSmartLens}
            />

            <MobileNavButton
              icon={ShoppingBag}
              darkMode={darkMode}
              onClick={openOrder}
            />

            <MobileNavButton
              icon={Settings}
              darkMode={darkMode}
              onClick={() =>
                setControlsOpen((current) => !current)
              }
            />

          </div>

          {/* =================================================
              CONTROLS POPUP
          ================================================= */}

          {controlsOpen && (
            <motion.div
              initial={{
                opacity: 0,
                y: -8,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              className="fixed right-5 top-[76px] z-[100] w-[250px] sm:right-8 lg:right-12"
            >

              <div
                className={`overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl ${
                  darkMode
                    ? "border-white/10 bg-[#080909]/95"
                    : "border-black/10 bg-white/95"
                }`}
              >

                {/* HEADER */}

                <div
                  className={`flex items-center justify-between border-b px-4 py-3 ${
                    darkMode
                      ? "border-white/[0.07]"
                      : "border-black/[0.07]"
                  }`}
                >

                  <div className="flex items-center gap-2">

                    <Settings
                      className="size-3.5"
                      style={{
                        color: displayAccent,
                      }}
                    />

                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: darkMode
                          ? "#FFFFFF"
                          : "#111111",
                      }}
                    >
                      Controls
                    </span>

                  </div>

                  <span
                    className="text-[8px] uppercase tracking-[0.16em]"
                    style={{
                      color: darkMode
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  >
                    Sonar
                  </span>

                </div>

                <div className="space-y-5 p-4">

                  {/* COLOR */}

                  <div>

                    <div className="mb-2 flex items-center justify-between">

                      <label
                        htmlFor="sonar-color"
                        className="text-[10px] font-medium"
                        style={{
                          color: darkMode
                            ? "rgba(255,255,255,0.65)"
                            : "rgba(0,0,0,0.65)",
                        }}
                      >
                        Color
                      </label>

                      <div className="flex items-center gap-2">

                        <span
                          className="font-mono text-[9px]"
                          style={{
                            color: darkMode
                              ? "rgba(255,255,255,0.65)"
                              : "rgba(0,0,0,0.65)",
                          }}
                        >
                          {settings.color.toUpperCase()}
                        </span>

                        <input
                          id="sonar-color"
                          type="color"
                          value={settings.color}
                          onChange={(event) =>
                            updateSetting(
                              "color",
                              event.target.value,
                            )
                          }
                          className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                        />

                      </div>

                    </div>

                    <div
                      className="h-1.5 w-full rounded-full"
                      style={{
                        background: displayAccent,
                        boxShadow: `0 0 14px ${displayAccent}`,
                      }}
                    />

                  </div>

                  {/* SPEED */}

                  <div>

                    <div className="mb-2 flex items-center justify-between">

                      <label
                        htmlFor="sonar-speed"
                        className="text-[10px] font-medium"
                        style={{
                          color: darkMode
                            ? "rgba(255,255,255,0.65)"
                            : "rgba(0,0,0,0.65)",
                        }}
                      >
                        Speed
                      </label>

                      <span
                        className="font-mono text-[10px]"
                        style={{
                          color: darkMode
                            ? "rgba(255,255,255,0.75)"
                            : "rgba(0,0,0,0.75)",
                        }}
                      >
                        {settings.speed}
                      </span>

                    </div>

                    <input
                      id="sonar-speed"
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={settings.speed}
                      onChange={(event) =>
                        updateSetting(
                          "speed",
                          Number(event.target.value),
                        )
                      }
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                      style={{
                        accentColor: displayAccent,
                      }}
                    />

                    <div
                      className="mt-1 flex justify-between text-[8px]"
                      style={{
                        color: darkMode
                          ? "rgba(255,255,255,0.28)"
                          : "rgba(0,0,0,0.35)",
                      }}
                    >
                      <span>50</span>
                      <span>500</span>
                    </div>

                  </div>

                  {/* RADIUS */}

                  <div>

                    <div className="mb-2 flex items-center justify-between">

                      <label
                        htmlFor="sonar-radius"
                        className="text-[10px] font-medium"
                        style={{
                          color: darkMode
                            ? "rgba(255,255,255,0.65)"
                            : "rgba(0,0,0,0.65)",
                        }}
                      >
                        Radius
                      </label>

                      <span
                        className="font-mono text-[10px]"
                        style={{
                          color: darkMode
                            ? "rgba(255,255,255,0.75)"
                            : "rgba(0,0,0,0.75)",
                        }}
                      >
                        {settings.dotRadius.toFixed(1)}
                      </span>

                    </div>

                    <input
                      id="sonar-radius"
                      type="range"
                      min="0.5"
                      max="4"
                      step="0.1"
                      value={settings.dotRadius}
                      onChange={(event) =>
                        updateSetting(
                          "dotRadius",
                          Number(event.target.value),
                        )
                      }
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                      style={{
                        accentColor: displayAccent,
                      }}
                    />

                    <div
                      className="mt-1 flex justify-between text-[8px]"
                      style={{
                        color: darkMode
                          ? "rgba(255,255,255,0.28)"
                          : "rgba(0,0,0,0.35)",
                      }}
                    >
                      <span>0.5</span>
                      <span>4.0</span>
                    </div>

                  </div>

                  {/* RESET */}

                  <button
                    type="button"
                    onClick={resetSettings}
                    className={`w-full rounded-xl border py-2.5 text-[10px] font-medium transition-all ${
                      darkMode
                        ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                        : "border-black/10 bg-black/[0.02] hover:bg-black/[0.05]"
                    }`}
                    style={{
                      color: darkMode
                        ? "rgba(255,255,255,0.65)"
                        : "rgba(0,0,0,0.65)",
                    }}
                  >
                    ↶ Reset
                  </button>

                </div>
              </div>
            </motion.div>
          )}

          {/* =================================================
              HERO CONTENT
          ================================================= */}

          <div
            className="relative z-10 flex min-h-screen flex-1 items-center px-5 pb-20 pt-36 sm:px-8 lg:px-12"
          >

            <div className="mx-auto grid w-full max-w-[1600px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[280px_minmax(500px,1fr)_280px] lg:gap-14 lg:px-8">

              {/* =================================================
                  LEFT FEATURES
              ================================================= */}

              <motion.div
                {...enter(0.3)}
                className="hidden flex-col gap-3 lg:flex"
              >

                <FeatureCard
                  icon={Camera}
                  label="VISION"
                  text="Camera + scene understanding"
                  darkMode={darkMode}
                  accent={displayAccent}
                />

                <FeatureCard
                  icon={Mic}
                  label="AUDIO"
                  text="Directional microphone array"
                  darkMode={darkMode}
                  accent={displayAccent}
                />

                <FeatureCard
                  icon={ScanText}
                  label="OCR"
                  text="Environmental text recognition"
                  darkMode={darkMode}
                  accent={displayAccent}
                />

              </motion.div>

              {/* =================================================
                  CENTER
              ================================================= */}

              <div className="flex min-w-0 flex-col items-center text-center">

                {/* EYEBROW */}

                <motion.div
                  {...enter(0)}
                  className={`relative z-20 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] ${
                    darkMode
                      ? "border-white/15 bg-white/[0.035]"
                      : "border-black/10 bg-black/[0.025]"
                  }`}
                  style={{
                    color: darkMode
                      ? "#FFFFFF"
                      : "#111111",
                  }}
                >

                  <Sparkles
                    className="size-3"
                    style={{
                      color: displayAccent,
                    }}
                  />

                  Multimodal Real-Time Communication

                </motion.div>

                {/* HEADING */}

                <motion.h1
                  {...enter(0.08)}
                  className="relative z-20 text-balance text-5xl font-semibold leading-[0.9] tracking-[-0.06em] sm:text-6xl md:text-7xl lg:text-[5rem]"
                  style={{
                    color: darkMode
                      ? "#FFFFFF"
                      : "#111111",
                  }}
                >

                  SEE MORE.
                  <br />

                  HEAR CLEARER.
                  <br />

                  <span
                    style={{
                      color: displayAccent,
                    }}
                  >
                    UNDERSTAND.
                  </span>

                </motion.h1>

                {/* DESCRIPTION */}

                <motion.p
                  {...enter(0.17)}
                  className="relative z-20 mt-7 max-w-xl text-pretty text-sm leading-7 sm:text-base"
                  style={{
                    color: secondaryText,
                  }}
                >
                  SmartLens combines vision, audio,
                  contextual intelligence and real-time
                  translation into one cross-reality
                  communication system.
                </motion.p>

                {/* BUTTONS */}

                <motion.div
                  {...enter(0.26)}
                  className="relative z-20 mt-9 flex flex-wrap justify-center gap-3"
                >

                  <button
                    type="button"
                    onClick={openSmartLens}
                    className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-black transition-all duration-300 hover:bg-white/90 active:scale-[0.97]"
                  >
                    Start SmartLens

                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollTo("features")}
                    className={`inline-flex h-12 items-center rounded-full border px-6 text-sm font-medium backdrop-blur transition-all duration-300 active:scale-[0.97] ${
                      darkMode
                        ? "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.07]"
                        : "border-black/10 bg-black/[0.025] hover:border-black/20 hover:bg-black/[0.05]"
                    }`}
                    style={{
                      color: darkMode
                        ? "#FFFFFF"
                        : "#111111",
                    }}
                  >
                    Explore Features
                  </button>

                </motion.div>

                {/* MOBILE FEATURES */}

                <motion.div
                  {...enter(0.35)}
                  className="mt-10 grid w-full max-w-md grid-cols-3 gap-2 lg:hidden"
                >

                  <MobileFeature
                    icon={Camera}
                    label="VISION"
                    darkMode={darkMode}
                    accent={displayAccent}
                  />

                  <MobileFeature
                    icon={Mic}
                    label="AUDIO"
                    darkMode={darkMode}
                    accent={displayAccent}
                  />

                  <MobileFeature
                    icon={Languages}
                    label="TRANSLATE"
                    darkMode={darkMode}
                    accent={displayAccent}
                  />

                </motion.div>

                {/* STATUS */}

                <motion.div
                  {...enter(0.42)}
                  className="relative z-20 mt-8 flex items-center gap-4 text-[9px] uppercase tracking-[0.2em]"
                  style={{
                    color: darkMode
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.5)",
                  }}
                >

                  <span className="flex items-center gap-2">

                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor: displayAccent,
                        boxShadow: `0 0 10px ${displayAccent}`,
                      }}
                    />

                    Multimodal Ready

                  </span>

                  <span
                    className={`hidden h-3 w-px sm:block ${
                      darkMode
                        ? "bg-white/15"
                        : "bg-black/15"
                    }`}
                  />

                  <span className="hidden sm:inline">
                    Real-Time Processing
                  </span>

                </motion.div>

              </div>

              {/* =================================================
                  RIGHT FEATURES
              ================================================= */}

              <motion.div
                {...enter(0.3)}
                className="hidden flex-col gap-3 lg:flex"
              >

                <FeatureCard
                  icon={Languages}
                  label="TRANSLATION"
                  text="Speech → language → voice"
                  align="right"
                  darkMode={darkMode}
                  accent={displayAccent}
                />

                <FeatureCard
                  icon={Waypoints}
                  label="SENSOR FUSION"
                  text="Audio + vision + context"
                  align="right"
                  darkMode={darkMode}
                  accent={displayAccent}
                />

                <FeatureCard
                  icon={Waves}
                  label="CROSS-REALITY"
                  text="Real World ↔ AR ↔ VR"
                  align="right"
                  darkMode={darkMode}
                  accent={displayAccent}
                />

              </motion.div>

            </div>
          </div>

          {/* =================================================
              SENSOR STRIP
          ================================================= */}

          <motion.div
            {...enter(0.5)}
            className={`relative z-10 mx-auto mb-6 flex w-[calc(100%-2rem)] max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t pt-4 text-[8px] uppercase tracking-[0.18em] sm:mb-8 sm:w-[calc(100%-4rem)]`}
            style={{
              borderColor: darkMode
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.1)",

              color: darkMode
                ? "rgba(255,255,255,0.5)"
                : "rgba(0,0,0,0.5)",
            }}
          >

            <span>MIC</span>

            <span style={{ color: displayAccent }}>
              +
            </span>

            <span>VISION</span>

            <span style={{ color: displayAccent }}>
              +
            </span>

            <span>OCR</span>

            <span style={{ color: displayAccent }}>
              +
            </span>

            <span>CONTEXT</span>

            <span style={{ color: displayAccent }}>
              →
            </span>

            <span
              style={{
                color: darkMode
                  ? "#FFFFFF"
                  : "#111111",
              }}
            >
              SMARTLENS FUSION
            </span>

          </motion.div>

        </SonarGrid>
      </div>

      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section
        id="features"
        className={`relative overflow-hidden border-t px-5 py-28 sm:px-8 lg:px-12 ${
          darkMode
            ? "border-white/[0.06] bg-[#030505]"
            : "border-black/[0.06] bg-[#f7f7f5]"
        }`}
      >

        <div className="relative mx-auto max-w-6xl">

          <div className="mb-14 max-w-2xl">

            <div
              className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: displayAccent,
              }}
            >

              <span
                className="size-1.5 rounded-full"
                style={{
                  backgroundColor: displayAccent,
                  boxShadow: `0 0 10px ${displayAccent}`,
                }}
              />

              The SmartLens System

            </div>

            <h2
              className="text-3xl font-semibold tracking-tight sm:text-5xl"
              style={{
                color: darkMode
                  ? "#FFFFFF"
                  : "#111111",
              }}
            >
              One interface.
              <br />

              <span
                style={{
                  color: darkMode
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(0,0,0,0.45)",
                }}
              >
                Multiple signals working together.
              </span>
            </h2>

            <p
              className="mt-5 max-w-xl text-sm leading-7 sm:text-base"
              style={{
                color: secondaryText,
              }}
            >
              SmartLens brings visual, audio and contextual
              signals together to support real-time
              communication and understanding.
            </p>

          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {features.map((feature, index) => {

              const Icon = feature.icon

              return (
                <motion.div
                  key={feature.title}

                  initial={
                    reduce
                      ? undefined
                      : {
                          opacity: 0,
                          y: 18,
                        }
                  }

                  whileInView={
                    reduce
                      ? undefined
                      : {
                          opacity: 1,
                          y: 0,
                        }
                  }

                  viewport={{
                    once: true,
                    margin: "-60px",
                  }}

                  transition={{
                    duration: 0.55,
                    delay: index * 0.06,
                  }}

                  className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
                    darkMode
                      ? "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.045]"
                      : "border-black/[0.08] bg-white hover:bg-black/[0.02]"
                  }`}
                >

                  <div className="mb-8 flex items-start justify-between">

                    <div
                      className="flex size-10 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: `rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, 0.15)`,
                        backgroundColor: `rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, 0.06)`,
                      }}
                    >
                      <Icon
                        className="size-4"
                        style={{
                          color: displayAccent,
                        }}
                      />
                    </div>

                    <span
                      className="text-[9px] tracking-[0.2em]"
                      style={{
                        color: darkMode
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(0,0,0,0.35)",
                      }}
                    >
                      0{index + 1}
                    </span>

                  </div>

                  <h3
                    className="text-lg font-medium"
                    style={{
                      color: darkMode
                        ? "#FFFFFF"
                        : "#111111",
                    }}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className="mt-2 text-sm leading-6"
                    style={{
                      color: secondaryText,
                    }}
                  >
                    {feature.text}
                  </p>

                  <div
                    className="mt-7 h-px w-full"
                    style={{
                      background: `linear-gradient(
                        to right,
                        rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, 0.2),
                        rgba(128,128,128,0.05),
                        transparent
                      )`,
                    }}
                  />

                </motion.div>
              )
            })}

          </div>
        </div>
      </section>

      {/* =====================================================
          BENEFITS
      ===================================================== */}

      <section
        className={`border-t px-5 py-28 sm:px-8 lg:px-12 ${
          darkMode
            ? "border-white/[0.06] bg-black"
            : "border-black/[0.06] bg-white"
        }`}
      >

        <div className="mx-auto max-w-6xl">

          <div className="mb-14 max-w-2xl">

            <div
              className="mb-4 text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: displayAccent,
              }}
            >
              Why SmartLens
            </div>

            <h2
              className="text-3xl font-semibold tracking-tight sm:text-5xl"
              style={{
                color: darkMode
                  ? "#FFFFFF"
                  : "#111111",
              }}
            >
              Communication,
              <br />

              <span
                style={{
                  color: darkMode
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(0,0,0,0.45)",
                }}
              >
                made more accessible.
              </span>
            </h2>

          </div>

          <div className="grid gap-4 md:grid-cols-2">

            {benefits.map((benefit, index) => (

              <motion.div
                key={benefit.title}

                initial={
                  reduce
                    ? undefined
                    : {
                        opacity: 0,
                        y: 20,
                      }
                }

                whileInView={
                  reduce
                    ? undefined
                    : {
                        opacity: 1,
                        y: 0,
                      }
                }

                viewport={{
                  once: true,
                  margin: "-80px",
                }}

                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                }}

                className={`rounded-3xl border p-7 ${
                  darkMode
                    ? "border-white/[0.08] bg-white/[0.025]"
                    : "border-black/[0.08] bg-black/[0.02]"
                }`}
              >

                <div
                  className="mb-6 flex size-10 items-center justify-center rounded-full border"
                  style={{
                    borderColor: `rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, 0.25)`,
                    color: displayAccent,
                  }}
                >
                  0{index + 1}
                </div>

                <h3
                  className="text-xl font-medium"
                  style={{
                    color: darkMode
                      ? "#FFFFFF"
                      : "#111111",
                  }}
                >
                  {benefit.title}
                </h3>

                <p
                  className="mt-3 text-sm leading-7"
                  style={{
                    color: secondaryText,
                  }}
                >
                  {benefit.text}
                </p>

              </motion.div>

            ))}

          </div>
        </div>
      </section>

      {/* =====================================================
          ARCHITECTURE
      ===================================================== */}

      <section
        className={`border-t px-5 py-28 sm:px-8 lg:px-12 ${
          darkMode
            ? "border-white/[0.06] bg-[#030505]"
            : "border-black/[0.06] bg-[#f7f7f5]"
        }`}
      >

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">

          <div>

            <div
              className="mb-4 text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: displayAccent,
              }}
            >
              Adaptive Multimodal Fusion
            </div>

            <h2
              className="text-3xl font-semibold tracking-tight sm:text-5xl"
              style={{
                color: darkMode
                  ? "#FFFFFF"
                  : "#111111",
              }}
            >
              From signals
              <br />

              <span
                style={{
                  color: darkMode
                    ? "rgba(255,255,255,0.45)"
                    : "rgba(0,0,0,0.45)",
                }}
              >
                to understanding.
              </span>
            </h2>

            <p
              className="mt-6 max-w-lg text-sm leading-7"
              style={{
                color: secondaryText,
              }}
            >
              Multiple inputs are combined to understand
              communication context before delivering
              translated information through voice, text
              or an extended-reality interface.
            </p>

          </div>

          <div
            className={`rounded-3xl border p-5 sm:p-8 ${
              darkMode
                ? "border-white/[0.08] bg-white/[0.025]"
                : "border-black/[0.08] bg-black/[0.02]"
            }`}
          >

            <ArchitectureNode
              icon={Mic}
              label="MICROPHONE"
              description="Directional audio"
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureLine
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureNode
              icon={Camera}
              label="VISION"
              description="Camera + scene context"
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureLine
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureNode
              icon={Waypoints}
              label="MULTIMODAL FUSION"
              description="Audio + vision + context"
              active
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureLine
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureNode
              icon={Languages}
              label="TRANSLATION"
              description="Language + speech processing"
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureLine
              darkMode={darkMode}
              accent={displayAccent}
            />

            <ArchitectureNode
              icon={Sparkles}
              label="AR / VOICE / XR"
              description="Deliver the result"
              darkMode={darkMode}
              accent={displayAccent}
            />

          </div>

        </div>
      </section>

      {/* =====================================================
          ORDER
      ===================================================== */}

      <section
        id="order"
        className={`relative overflow-hidden border-t px-5 py-32 text-center sm:px-8 ${
          darkMode
            ? "border-white/[0.06] bg-black"
            : "border-black/[0.06] bg-white"
        }`}
      >

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(
              circle,
              rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, ${
                darkMode ? "0.07" : "0.035"
              }),
              transparent 65%
            )`,
          }}
        />

        <div className="relative mx-auto max-w-3xl">

          <div
            className="mb-5 text-[10px] uppercase tracking-[0.3em]"
            style={{
              color: displayAccent,
            }}
          >
            SmartLens
          </div>

          <h2
            className="text-4xl font-semibold tracking-tight sm:text-6xl"
            style={{
              color: darkMode
                ? "#FFFFFF"
                : "#111111",
            }}
          >
            The interface
            <br />

            <span
              style={{
                color: displayAccent,
              }}
            >
              for a connected world.
            </span>
          </h2>

          <p
            className="mx-auto mt-6 max-w-xl text-sm leading-7 sm:text-base"
            style={{
              color: secondaryText,
            }}
          >
            SmartLens is being developed as a multimodal
            communication system combining vision, audio,
            translation and cross-reality interaction.
          </p>

          <button
            type="button"
            onClick={openSmartLens}
            className={`group mt-9 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-medium transition-all duration-300 active:scale-[0.97] ${
              darkMode
                ? "bg-white text-black hover:bg-white/85"
                : "bg-black text-white hover:bg-black/85"
            }`}
          >
            Start SmartLens

            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        className={`border-t px-5 py-8 sm:px-8 lg:px-12 ${
          darkMode
            ? "border-white/[0.06] bg-black"
            : "border-black/[0.06] bg-white"
        }`}
      >

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">

          <div>

            <div
              className="text-sm font-semibold tracking-[0.18em]"
              style={{
                color: darkMode
                  ? "#FFFFFF"
                  : "#111111",
              }}
            >
              SMARTLENS
            </div>

            <div
              className="mt-1 text-[9px] uppercase tracking-[0.2em]"
              style={{
                color: darkMode
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(0,0,0,0.35)",
              }}
            >
              See. Hear. Understand.
            </div>

          </div>

          <div
            className="text-[9px] uppercase tracking-[0.2em]"
            style={{
              color: darkMode
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.35)",
            }}
          >
            Multimodal Real-Time Translation & Cross-Reality Communication
          </div>

        </div>
      </footer>


      {/* =====================================================
          FINAL SCROLL REVEAL / STORY EXPERIENCE
      ===================================================== */}

      <section
        id="lens-story"
        className={
          darkMode
            ? "bg-black"
            : "bg-white"
        }
      >
        <SmartLensScrollReveal
          onStartLens={openSmartLens}
        />
      </section>

      </main>
    </>
  )
}

/* =========================================================
   NAV BUTTON
========================================================= */

function NavButton({
  icon: Icon,
  label,
  onClick,
  darkMode,
  active = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  darkMode: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-medium transition-all ${
        active
          ? darkMode
            ? "bg-white/10 text-white"
            : "bg-black/10 text-black"
          : darkMode
            ? "text-white/55 hover:bg-white/[0.06] hover:text-white"
            : "text-black/60 hover:bg-black/[0.05] hover:text-black"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

/* =========================================================
   MOBILE NAV
========================================================= */

function MobileNavButton({
  icon: Icon,
  onClick,
  darkMode,
}: {
  icon: LucideIcon
  onClick: () => void
  darkMode: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full transition"
      style={{
        color: darkMode
          ? "rgba(255,255,255,0.7)"
          : "rgba(0,0,0,0.7)",
      }}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  icon: Icon,
  label,
  text,
  align = "left",
  darkMode,
  accent,
}: {
  icon: LucideIcon
  label: string
  text: string
  align?: "left" | "right"
  darkMode: boolean
  accent: string
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border p-3 backdrop-blur-md transition-all duration-300 ${
        align === "right"
          ? "flex-row-reverse text-right"
          : ""
      } ${
        darkMode
          ? "border-white/[0.08] bg-black/30 hover:bg-white/[0.04]"
          : "border-black/[0.08] bg-white/75 hover:bg-black/[0.025]"
      }`}
    >

      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
          darkMode
            ? "border-white/10 bg-white/[0.04]"
            : "border-black/10 bg-black/[0.025]"
        }`}
      >
        <Icon
          className="size-4"
          style={{
            color: accent,
          }}
        />
      </div>

      <div className="min-w-0">

        <div
          className="text-[9px] font-medium tracking-[0.2em]"
          style={{
            color: darkMode
              ? "#FFFFFF"
              : "#111111",
          }}
        >
          {label}
        </div>

        <div
          className="mt-1 text-[11px] leading-4"
          style={{
            color: darkMode
              ? "rgba(255,255,255,0.62)"
              : "rgba(0,0,0,0.62)",
          }}
        >
          {text}
        </div>

      </div>
    </div>
  )
}

/* =========================================================
   MOBILE FEATURE
========================================================= */

function MobileFeature({
  icon: Icon,
  label,
  darkMode,
  accent,
}: {
  icon: LucideIcon
  label: string
  darkMode: boolean
  accent: string
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 ${
        darkMode
          ? "border-white/[0.08] bg-white/[0.025]"
          : "border-black/[0.08] bg-white/70"
      }`}
    >

      <Icon
        className="size-4"
        style={{
          color: accent,
        }}
      />

      <span
        className="text-[8px] tracking-[0.15em]"
        style={{
          color: darkMode
            ? "rgba(255,255,255,0.65)"
            : "rgba(0,0,0,0.65)",
        }}
      >
        {label}
      </span>

    </div>
  )
}

/* =========================================================
   ARCHITECTURE NODE
========================================================= */

function ArchitectureNode({
  icon: Icon,
  label,
  description,
  active = false,
  darkMode,
  accent,
}: {
  icon: LucideIcon
  label: string
  description: string
  active?: boolean
  darkMode: boolean
  accent: string
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border p-4"
      style={{
        borderColor: active
          ? `${accent}40`
          : darkMode
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.07)",

        backgroundColor: active
          ? `${accent}08`
          : darkMode
            ? "rgba(0,0,0,0.2)"
            : "rgba(0,0,0,0.015)",
      }}
    >

      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
        style={{
          borderColor: active
            ? `${accent}40`
            : darkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",

          backgroundColor: active
            ? `${accent}12`
            : darkMode
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)",
        }}
      >
        <Icon
          className="size-4"
          style={{
            color: active
              ? accent
              : darkMode
                ? "rgba(255,255,255,0.6)"
                : "rgba(0,0,0,0.55)",
          }}
        />
      </div>

      <div>

        <div
          className="text-[10px] font-medium tracking-[0.18em]"
          style={{
            color: active
              ? accent
              : darkMode
                ? "#FFFFFF"
                : "#111111",
          }}
        >
          {label}
        </div>

        <div
          className="mt-1 text-xs"
          style={{
            color: darkMode
              ? "rgba(255,255,255,0.5)"
              : "rgba(0,0,0,0.55)",
          }}
        >
          {description}
        </div>

      </div>
    </div>
  )
}

/* =========================================================
   ARCHITECTURE LINE
========================================================= */

function ArchitectureLine({
  darkMode,
  accent,
}: {
  darkMode: boolean
  accent: string
}) {
  return (
    <div
      className="ml-5 h-5 w-px"
      style={{
        background: `linear-gradient(
          to bottom,
          ${accent}50,
          ${
            darkMode
              ? "transparent"
              : "rgba(0,0,0,0.05)"
          }
        )`,
      }}
    />
  )
}