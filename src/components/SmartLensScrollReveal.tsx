"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SmartLensScrollRevealProps {
  onStartLens?: () => void;
}

export default function SmartLensScrollReveal({
  onStartLens,
}: SmartLensScrollRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const reveal = revealRef.current;
    const ring = ringRef.current;
    const content = contentRef.current;

    if (!section || !reveal || !ring || !content) return;

    const ctx = gsap.context(() => {
      /*
       * Initial state
       *
       * Small circular SmartLens portal in the center.
       */
      gsap.set(reveal, {
        clipPath: "circle(12% at 50% 50%)",
      });

      gsap.set(content, {
        opacity: 0,
        scale: 0.92,
      });

      gsap.set(ring, {
        rotation: 0,
      });

      /*
       * Scroll-controlled expansion.
       */
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=1800",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
        },
      });

      /*
       * Circle expands.
       */
      timeline.to(
        reveal,
        {
          clipPath: "circle(150% at 50% 50%)",
          ease: "none",
          duration: 1,
        },
        0,
      );

      /*
       * Rotating ring.
       */
      timeline.to(
        ring,
        {
          rotation: 360,
          ease: "none",
          duration: 1,
        },
        0,
      );

      /*
       * Product content appears while circle expands.
       */
      timeline.to(
        content,
        {
          opacity: 1,
          scale: 1,
          ease: "power2.out",
          duration: 0.35,
        },
        0.45,
      );
    }, section);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden bg-[#050707]"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#050707]" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* Small intro text */}
      <div className="absolute left-1/2 top-[12%] z-30 -translate-x-1/2 text-center">
        <p className="text-[10px] font-semibold tracking-[0.35em] text-white/45 uppercase">
          Continue exploring
        </p>

        <h2 className="mt-3 text-xl font-medium tracking-tight text-white/80 md:text-2xl">
          The intelligence behind SmartLens
        </h2>
      </div>

      {/* Expanding circular portal */}
      <div
        ref={revealRef}
        className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-[#f5f5f2]"
      >
        {/* Product visual */}
        <div
          ref={contentRef}
          className="relative flex h-full w-full items-center justify-center"
        >
          {/* Soft radial background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#ffffff_0%,#f1f2ef_45%,#dfe2dd_100%)]" />

          {/* Rotating ring */}
          <div
            ref={ringRef}
            className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 md:h-[420px] md:w-[420px]"
          >
            <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-black" />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-semibold tracking-[0.35em] text-black/45 uppercase md:text-[11px]">
              VISION • AUDIO • TRANSLATION • XR •
            </div>
          </div>

          {/* Main SmartLens visual */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Glasses representation */}
            <div className="relative mb-10 flex items-center gap-3 md:gap-5">
              {/* Left lens */}
              <div className="relative h-24 w-32 rounded-[45%] border-[3px] border-black/80 bg-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl md:h-36 md:w-48">
                <div className="absolute inset-3 rounded-[40%] border border-black/10" />

                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70" />
              </div>

              {/* Bridge */}
              <div className="h-5 w-8 rounded-full bg-black/80 md:w-12" />

              {/* Right lens */}
              <div className="relative h-24 w-32 rounded-[45%] border-[3px] border-black/80 bg-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl md:h-36 md:w-48">
                <div className="absolute inset-3 rounded-[40%] border border-black/10" />

                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70" />
              </div>
            </div>

            {/* Product label */}
            <p className="text-[10px] font-semibold tracking-[0.35em] text-black/45 uppercase">
              SmartLens
            </p>

            <h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-black md:text-6xl">
              SEE. HEAR.
              <br />
              <span className="text-black/45">UNDERSTAND.</span>
            </h2>

            <p className="mt-5 max-w-lg px-6 text-sm leading-relaxed text-black/55 md:text-base">
              One wearable interface connecting vision, audio, translation,
              accessibility and cross-reality communication.
            </p>

            {/* Start Lens */}
            <button
              type="button"
              onClick={onStartLens}
              className="group mt-8 inline-flex items-center gap-3 rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl active:scale-[0.98]"
            >
              Start SmartLens

              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>

            {/* Small system indicators */}
            <div className="mt-7 flex items-center gap-5 text-[9px] font-medium tracking-[0.2em] text-black/40 uppercase">
              <span>Multimodal</span>

              <span className="h-1 w-1 rounded-full bg-black/30" />

              <span>Real-Time</span>

              <span className="h-1 w-1 rounded-full bg-black/30" />

              <span>Cross-Reality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom scroll hint */}
      <div className="absolute bottom-[8%] left-1/2 z-30 -translate-x-1/2 text-center">
        <p className="text-[9px] font-semibold tracking-[0.3em] text-white/40 uppercase">
          Scroll to activate
        </p>
      </div>
    </section>
  );
}