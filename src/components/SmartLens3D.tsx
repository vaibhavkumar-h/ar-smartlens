"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, useGLTF } from "@react-three/drei"
import * as THREE from "three"

type SmartLens3DProps = {
  arText?: string
  summaryText?: string
  sourceLanguage?: string
  targetLanguage?: string
}

type HotspotProps = {
  position: [number, number, number]
  label: string
  title: string
  detail: string
  active: boolean
  onHover: () => void
  onLeave: () => void
}

function Hotspot({ position, label, title, detail, active, onHover, onLeave }: HotspotProps) {
  return (
    <group position={position}>
      <mesh
        onPointerEnter={(event) => {
          event.stopPropagation()
          onHover()
        }}
        onPointerLeave={(event) => {
          event.stopPropagation()
          onLeave()
        }}
      >
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial color="#c8fcff" transparent opacity={active ? 0.95 : 0.16} />
      </mesh>

      {active && (
        <Html
          center
          distanceFactor={3.5}
          position={[0, 0.16, 0]}
          style={{ pointerEvents: "none", width: "min(230px, 38vw)", maxWidth: 230 }}
        >
          <div className="rounded-2xl border border-white/10 bg-black/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <div className="text-[9px] uppercase tracking-[0.22em] text-cyan-100/60">{label}</div>
            <div className="mt-1 text-sm font-medium text-white">{title}</div>
            <div className="mt-1 text-[10px] leading-4 text-white/45">{detail}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

function CursorResponsiveModel({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const { pointer, size } = useThree()

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const mobile = size.width < 640
    const tablet = size.width >= 640 && size.width < 1024

    const targetX = pointer.x * (mobile ? 0.055 : tablet ? 0.08 : 0.11)
    const targetY = pointer.y * (mobile ? 0.035 : tablet ? 0.05 : 0.065)

    const targetRotY = pointer.x * (mobile ? 0.055 : 0.10)
    const targetRotX = -pointer.y * (mobile ? 0.035 : 0.055)
    const targetRotZ = -pointer.x * (mobile ? 0.012 : 0.025)

    const baseX = mobile ? 0 : tablet ? 0.18 : 0.42
    const baseY = mobile ? -0.03 : -0.08

    group.position.x = THREE.MathUtils.lerp(group.position.x, baseX + targetX, 0.055)
    group.position.y = THREE.MathUtils.lerp(group.position.y, baseY + targetY, 0.055)
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, Math.PI + targetRotY, 0.055)
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetRotX, 0.055)
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, targetRotZ, 0.055)
  })

  return <group ref={groupRef}>{children}</group>
}

function ResponsiveCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const mobile = size.width < 640
    const tablet = size.width >= 640 && size.width < 1024

    camera.fov = mobile ? 38 : tablet ? 34 : 30
    camera.position.set(0, 0, mobile ? 6.8 : tablet ? 5.9 : 5.15)
    camera.aspect = size.width / Math.max(size.height, 1)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  return null
}

function LensARDisplay({
  bounds,
  leftRef,
  rightRef,
  modelGroupRef,
}: {
  bounds: { size: THREE.Vector3; center: THREE.Vector3 }
  leftRef: React.RefObject<HTMLDivElement | null>
  rightRef: React.RefObject<HTMLDivElement | null>
  modelGroupRef: React.RefObject<THREE.Group | null>
}) {
  const { size, center } = bounds
  const { camera, size: viewport } = useThree()

  useFrame(({ gl }) => {
    const width = gl.domElement.clientWidth
    const height = gl.domElement.clientHeight
    if (!width || !height) return

    const project = (point: THREE.Vector3) => {
      const world = point.clone()
      if (modelGroupRef.current) modelGroupRef.current.localToWorld(world)
      world.project(camera)
      return {
        x: (world.x * 0.5 + 0.5) * width,
        y: (-world.y * 0.5 + 0.5) * height,
      }
    }

    const mobile = viewport.width < 640
    const xFactor = mobile ? 0.19 : 0.235
    const zOffset = Math.max(size.z * 0.9, mobile ? 0.18 : 0.22)

    const left = project(new THREE.Vector3(
      center.x - size.x * xFactor,
      center.y + size.y * 0.005,
      center.z + zOffset,
    ))

    const right = project(new THREE.Vector3(
      center.x + size.x * xFactor,
      center.y + size.y * 0.005,
      center.z + zOffset,
    ))

    if (leftRef.current) {
      leftRef.current.style.transform = `translate3d(${left.x}px, ${left.y}px, 0) translate(-50%, -50%)`
    }

    if (rightRef.current) {
      rightRef.current.style.transform = `translate3d(${right.x}px, ${right.y}px, 0) translate(-50%, -50%)`
    }
  })

  return null
}

function LensAROverlay({
  arText,
  summaryText,
  sourceLanguage,
  targetLanguage,
  leftRef,
  rightRef,
}: {
  arText: string
  summaryText: string
  sourceLanguage: string
  targetLanguage: string
  leftRef: React.RefObject<HTMLDivElement | null>
  rightRef: React.RefObject<HTMLDivElement | null>
}) {
  const lensPanel =
    "absolute left-0 top-0 w-[clamp(112px,11vw,172px)] min-h-[72px] max-h-[120px] overflow-hidden rounded-[12px] border border-cyan-100/35 bg-[#020607]/35 px-2.5 py-2 text-left shadow-[0_0_24px_rgba(103,232,249,.16)] backdrop-blur-[2px]"

  const liveTextStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 3,
    overflow: "hidden",
    overflowWrap: "anywhere",
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div ref={leftRef} className={lensPanel}>
        <div className="flex items-center justify-between gap-1.5 text-[clamp(7px,0.58vw,10px)] font-semibold uppercase tracking-[0.13em] text-cyan-100/90">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_9px_rgba(165,243,252,.95)]" />
            <span className="truncate">LIVE AR</span>
          </span>
          <span className="shrink-0 text-cyan-100/45">AR-01</span>
        </div>
        <div
          className="mt-1.5 text-[clamp(10px,0.85vw,16px)] font-semibold leading-[1.12] text-white drop-shadow-[0_0_10px_rgba(165,243,252,.65)]"
          style={liveTextStyle}
        >
          {arText || "Waiting for input..."}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[6px] uppercase tracking-[0.12em] text-white/40">
          <span className="truncate">{sourceLanguage} → {targetLanguage}</span>
          <span className="shrink-0">TRANSLATION</span>
        </div>
      </div>

      <div ref={rightRef} className={lensPanel}>
        <div className="flex items-center justify-between gap-1.5 text-[clamp(7px,0.58vw,10px)] font-semibold uppercase tracking-[0.13em] text-cyan-100/90">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_9px_rgba(165,243,252,.95)]" />
            <span className="truncate">CONTEXT</span>
          </span>
          <span className="shrink-0 text-cyan-100/45">LIVE</span>
        </div>
        <div
          className="mt-1.5 text-[clamp(10px,0.85vw,16px)] font-semibold leading-[1.12] text-cyan-50 drop-shadow-[0_0_10px_rgba(165,243,252,.65)]"
          style={liveTextStyle}
        >
          {summaryText || "Waiting for context..."}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[6px] uppercase tracking-[0.12em] text-white/40">
          <span>SMART SUMMARY</span>
          <span>SYNC</span>
        </div>
      </div>
    </div>
  )
}

function SmartLensModel({
  leftOverlayRef,
  rightOverlayRef,
}: {
  leftOverlayRef: React.RefObject<HTMLDivElement | null>
  rightOverlayRef: React.RefObject<HTMLDivElement | null>
}) {
  const { scene } = useGLTF("/models/smartlens.glb")
  const [hoveredPart, setHoveredPart] = useState("")
  const modelGroupRef = useRef<THREE.Group>(null)

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    return {
      size,
      center,
      baseScale: Math.min(
        2.65 / Math.max(size.x, 0.001),
        1.55 / Math.max(size.y, 0.001),
      ),
    }
  }, [scene])

  const { size: viewport } = useThree()
  const mobile = viewport.width < 640
  const tablet = viewport.width >= 640 && viewport.width < 1024
  const responsiveScale = mobile ? 1.68 : tablet ? 1.96 : 2.22

  const interactiveModel = (
    <>
      <primitive
        object={scene}
        onPointerOver={(event: any) => {
          event.stopPropagation()
          setHoveredPart(event.object?.name || "SmartLens")
        }}
        onPointerOut={(event: any) => {
          event.stopPropagation()
          setHoveredPart("")
        }}
      />

      <LensARDisplay
        bounds={{ size: fit.size, center: fit.center }}
        leftRef={leftOverlayRef}
        rightRef={rightOverlayRef}
        modelGroupRef={modelGroupRef}
      />

      <Hotspot
        position={[-fit.size.x * 0.42, fit.size.y * 0.05, fit.size.z * 0.22]}
        label="VISION"
        title="Camera / OCR"
        detail="Scene understanding, speaker validation and text extraction."
        active={hoveredPart === "vision-hotspot"}
        onHover={() => setHoveredPart("vision-hotspot")}
        onLeave={() => setHoveredPart("")}
      />
      <Hotspot
        position={[fit.size.x * 0.42, fit.size.y * 0.05, fit.size.z * 0.22]}
        label="AR / XR"
        title="Display Layer"
        detail="Translated captions and cross-reality output."
        active={hoveredPart === "ar-hotspot"}
        onHover={() => setHoveredPart("ar-hotspot")}
        onLeave={() => setHoveredPart("")}
      />
      <Hotspot
        position={[0, fit.size.y * 0.12, fit.size.z * 0.30]}
        label="FUSION"
        title="Multimodal Bridge"
        detail="Audio + vision + context before translation."
        active={hoveredPart === "fusion-hotspot"}
        onHover={() => setHoveredPart("fusion-hotspot")}
        onLeave={() => setHoveredPart("")}
      />
      <Hotspot
        position={[-fit.size.x * 0.66, -fit.size.y * 0.05, fit.size.z * 0.12]}
        label="AUDIO INPUT"
        title="Directional Mic"
        detail="Speech capture and noise-aware input."
        active={hoveredPart === "mic-hotspot"}
        onHover={() => setHoveredPart("mic-hotspot")}
        onLeave={() => setHoveredPart("")}
      />
      <Hotspot
        position={[fit.size.x * 0.66, -fit.size.y * 0.05, fit.size.z * 0.12]}
        label="AUDIO OUTPUT"
        title="Spatial Speaker"
        detail="Translated speech and audio feedback."
        active={hoveredPart === "speaker-hotspot"}
        onHover={() => setHoveredPart("speaker-hotspot")}
        onLeave={() => setHoveredPart("")}
      />
    </>
  )

  return (
    <CursorResponsiveModel>
      <group ref={modelGroupRef} scale={fit.baseScale * responsiveScale}>
        {interactiveModel}
      </group>
    </CursorResponsiveModel>
  )
}

function Loading() {
  return (
    <Html center>
      <div className="rounded-full border border-white/10 bg-black/75 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-white/50">
        Loading SmartLens
      </div>
    </Html>
  )
}

export default function SmartLens3D({
  arText = "",
  summaryText = "",
  sourceLanguage = "EN",
  targetLanguage = "HI",
}: SmartLens3DProps) {
  const leftOverlayRef = useRef<HTMLDivElement>(null)
  const rightOverlayRef = useRef<HTMLDivElement>(null)

  return (
    <div className="group relative h-[clamp(390px,60vh,640px)] min-h-[390px] w-full min-w-0 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#030505]">
      <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,rgba(165,243,252,.075),transparent_52%)]" />

      <Canvas
        className="relative z-10 !h-full !w-full"
        camera={{ position: [0, 0, 5.4], fov: 30 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ResponsiveCamera />
        <ambientLight intensity={2.4} />
        <hemisphereLight args={["#ffffff", "#182020", 2.5]} />
        <directionalLight position={[4, 5, 6]} intensity={4.2} />
        <directionalLight position={[-4, 2, 3]} intensity={2.3} />
        <pointLight position={[0, 0.5, 2]} intensity={3} />

        <Suspense fallback={<Loading />}>
          <SmartLensModel
            leftOverlayRef={leftOverlayRef}
            rightOverlayRef={rightOverlayRef}
          />
        </Suspense>
      </Canvas>

      <LensAROverlay
        arText={arText}
        summaryText={summaryText}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        leftRef={leftOverlayRef}
        rightRef={rightOverlayRef}
      />

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[7px] uppercase tracking-[0.16em] text-white/40 backdrop-blur-md sm:bottom-4 sm:text-[8px] sm:tracking-[0.18em]">
        MOVE CURSOR · SMARTLENS PARALLAX
      </div>
    </div>
  )
}

useGLTF.preload("/models/smartlens.glb")
