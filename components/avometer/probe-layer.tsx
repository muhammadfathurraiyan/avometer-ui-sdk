"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Button } from "@ui-sdk/react/button"
import { SUBJECTS } from "@/lib/measurement"

export type ContactSide = "plus" | "minus"
export type Lead = "red" | "black"

export interface Contact {
  itemId: string
  side: ContactSide
}

export interface ProbePoint {
  /** Local to the scene, in CSS pixels. */
  x: number
  y: number
  contact: Contact | null
}

export interface Probes {
  red: ProbePoint
  black: ProbePoint
}

interface Point {
  x: number
  y: number
}

export interface BenchGeometry {
  width: number
  height: number
  terminals: Record<string, Point>
  jacks: Record<Lead, Point>
  reach: Record<Lead, number>
  meter: { left: number; top: number; right: number; bottom: number }
}

const CONTACT_HIT = 28
const CONTACT_SNAP = 36
/** Tip to the back of the probe grip. */
const BUTT_LENGTH = 92
const PROBE_TILT: Record<Lead, number> = { red: -19, black: 19 }
const CONTACTS: Contact[] = SUBJECTS.flatMap((subject) => [
  { itemId: subject.id, side: "plus" as const },
  { itemId: subject.id, side: "minus" as const },
])

export function contactKey(contact: Contact): string {
  return `${contact.itemId}:${contact.side}`
}

export function contactLabel(contact: Contact | null): string {
  if (!contact) return "off the test points"
  const subject = SUBJECTS.find((entry) => entry.id === contact.itemId)
  const post = contact.side === "plus" ? "+" : "−"
  return `${subject?.name ?? "component"} ${post} post`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function centerOf(element: Element, sceneRect: DOMRect): Point {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left - sceneRect.left + rect.width / 2,
    y: rect.top - sceneRect.top + rect.height / 2,
  }
}

function insideScene(point: Point, geometry: BenchGeometry): Point {
  return {
    x: clamp(point.x, 8, geometry.width - 8),
    y: clamp(point.y, 8, geometry.height - 8),
  }
}

function withinWire(point: Point, jack: Point, reach: number): Point {
  const dx = point.x - jack.x
  const dy = point.y - jack.y
  const distance = Math.hypot(dx, dy)
  if (distance <= reach) return point
  return {
    x: jack.x + (dx / distance) * reach,
    y: jack.y + (dy / distance) * reach,
  }
}

function contactFromKey(key: string): Contact | null {
  const cut = key.lastIndexOf(":")
  if (cut < 0) return null
  const side = key.slice(cut + 1)
  if (side !== "plus" && side !== "minus") return null
  return { itemId: key.slice(0, cut), side }
}

function settle(current: Probes, geometry: BenchGeometry): Probes {
  const place = (probe: ProbePoint, lead: Lead): ProbePoint => {
    if (probe.contact) {
      const terminal = geometry.terminals[contactKey(probe.contact)]
      if (terminal) return { ...probe, x: terminal.x, y: terminal.y }
    }
    const wired = withinWire(probe, geometry.jacks[lead], geometry.reach[lead])
    return { ...probe, ...insideScene(wired, geometry) }
  }
  return { red: place(current.red, "red"), black: place(current.black, "black") }
}

function terminalNear(
  scene: HTMLElement,
  sceneRect: DOMRect,
  point: Point,
  radius: number
): { key: string; point: Point } | null {
  let nearestKey: string | null = null
  let nearestPoint: Point | null = null
  let nearestDistance = Infinity
  scene.querySelectorAll<HTMLElement>("[data-terminal]").forEach((element) => {
    const key = element.dataset.terminal
    if (!key) return
    const center = centerOf(element, sceneRect)
    const distance = Math.hypot(center.x - point.x, center.y - point.y)
    if (distance <= radius && distance < nearestDistance) {
      nearestKey = key
      nearestPoint = center
      nearestDistance = distance
    }
  })
  return nearestKey && nearestPoint ? { key: nearestKey, point: nearestPoint } : null
}

export function useProbes(sceneRef: React.RefObject<HTMLDivElement | null>) {
  const [probes, setProbes] = useState<Probes>({
    red: { x: 0, y: 0, contact: { itemId: "cell", side: "plus" } },
    black: { x: 0, y: 0, contact: { itemId: "cell", side: "minus" } },
  })
  const [geometry, setGeometry] = useState<BenchGeometry | null>(null)
  const [dragging, setDragging] = useState<Lead | null>(null)
  const [hot, setHot] = useState<string | null>(null)
  const dragRef = useRef<{
    lead: Lead
    pointerId: number
    offsetX: number
    offsetY: number
    startX: number
    startY: number
    moved: boolean
    tip: Point
  } | null>(null)
  const suppressClick = useRef(false)

  const measure = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return
    const rect = scene.getBoundingClientRect()
    if (rect.width < 40 || rect.height < 40) return

    const terminals: Record<string, Point> = {}
    scene.querySelectorAll<HTMLElement>("[data-terminal]").forEach((element) => {
      const key = element.dataset.terminal
      if (key) terminals[key] = centerOf(element, rect)
    })
    const redJack = scene.querySelector<HTMLElement>('[data-jack="red"]')
    const blackJack = scene.querySelector<HTMLElement>('[data-jack="black"]')
    if (!redJack || !blackJack) return

    const jacks = { red: centerOf(redJack, rect), black: centerOf(blackJack, rect) }
    const meterElement = scene.querySelector<HTMLElement>(".avometer")
    const meterRect = meterElement?.getBoundingClientRect()
    const meter = {
      left: (meterRect?.left ?? 0) - rect.left,
      top: (meterRect?.top ?? 0) - rect.top,
      right: (meterRect?.right ?? 0) - rect.left,
      bottom: (meterRect?.bottom ?? 0) - rect.top,
    }
    const reachFrom = (jack: Point) => {
      let furthest = 0
      for (const terminal of Object.values(terminals)) {
        furthest = Math.max(furthest, Math.hypot(terminal.x - jack.x, terminal.y - jack.y))
      }
      return Math.max(220, furthest + 48)
    }
    const next: BenchGeometry = {
      width: rect.width,
      height: rect.height,
      terminals,
      jacks,
      reach: { red: reachFrom(jacks.red), black: reachFrom(jacks.black) },
      meter,
    }
    setGeometry(next)
    setProbes((current) => settle(current, next))
  }, [sceneRef])

  useEffect(() => {
    measure()
    const scene = sceneRef.current
    if (!scene) return
    let alive = true
    const observer = new ResizeObserver(() => measure())
    observer.observe(scene)
    void document.fonts?.ready.then(() => {
      if (alive) measure()
    })
    return () => {
      alive = false
      observer.disconnect()
    }
  }, [measure, sceneRef])

  const clipToItem = useCallback(
    (itemId: string) => {
      setProbes((current) => {
        const place = (lead: Lead, side: ContactSide): ProbePoint => {
          const contact: Contact = { itemId, side }
          const terminal = geometry?.terminals[contactKey(contact)]
          return {
            x: terminal?.x ?? current[lead].x,
            y: terminal?.y ?? current[lead].y,
            contact,
          }
        }
        return { red: place("red", "plus"), black: place("black", "minus") }
      })
    },
    [geometry]
  )

  const cycleLead = useCallback(
    (lead: Lead, step: 1 | -1 = 1) => {
      setProbes((current) => {
        const contact = current[lead].contact
        const index = contact
          ? CONTACTS.findIndex(
              (entry) => entry.itemId === contact.itemId && entry.side === contact.side
            )
          : -1
        const size = CONTACTS.length
        const next = CONTACTS[(((index + step) % size) + size) % size]
        const terminal = geometry?.terminals[contactKey(next)]
        return {
          ...current,
          [lead]: {
            x: terminal?.x ?? current[lead].x,
            y: terminal?.y ?? current[lead].y,
            contact: next,
          },
        }
      })
    },
    [geometry]
  )

  const beginDrag = (lead: Lead) => (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const scene = sceneRef.current
    if (!scene) return
    const rect = scene.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const probe = probes[lead]
    dragRef.current = {
      lead,
      pointerId: event.pointerId,
      offsetX: probe.x - point.x,
      offsetY: probe.y - point.y,
      startX: point.x,
      startY: point.y,
      moved: false,
      tip: { x: probe.x, y: probe.y },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(lead)
  }

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    const scene = sceneRef.current
    if (!drag || !scene || drag.pointerId !== event.pointerId) return
    const rect = scene.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    if (!drag.moved) {
      if (Math.hypot(point.x - drag.startX, point.y - drag.startY) < 2.5) return
      drag.moved = true
    }

    let target = { x: point.x + drag.offsetX, y: point.y + drag.offsetY }
    if (geometry) {
      target = withinWire(target, geometry.jacks[drag.lead], geometry.reach[drag.lead])
      target = insideScene(target, geometry)
    }
    drag.tip = target

    const nearby = terminalNear(scene, rect, target, CONTACT_HIT)
    setHot(nearby?.key ?? null)
    setProbes((current) => ({
      ...current,
      [drag.lead]: { x: target.x, y: target.y, contact: null },
    }))
  }

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null

    if (drag.moved) {
      const scene = sceneRef.current
      if (scene) {
        const rect = scene.getBoundingClientRect()
        const nearby = terminalNear(scene, rect, drag.tip, CONTACT_SNAP)
        const contact = nearby ? contactFromKey(nearby.key) : null
        if (contact && nearby) {
          setProbes((current) => ({
            ...current,
            [drag.lead]: { x: nearby.point.x, y: nearby.point.y, contact },
          }))
        }
      }
      suppressClick.current = true
      window.setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }

    setDragging(null)
    setHot(null)
  }

  const clickLead = (lead: Lead) => () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    cycleLead(lead)
  }

  return {
    probes,
    geometry,
    dragging,
    hot,
    clipToItem,
    cycleLead,
    beginDrag,
    moveDrag,
    endDrag,
    clickLead,
  }
}

function buttOf(probe: ProbePoint, lead: Lead): Point {
  const angle = (PROBE_TILT[lead] * Math.PI) / 180
  return {
    x: probe.x - Math.cos(angle) * BUTT_LENGTH,
    y: probe.y - Math.sin(angle) * BUTT_LENGTH,
  }
}

function cablePath(
  start: Point,
  end: Point,
  reach: number,
  meter: BenchGeometry["meter"],
  lead: Lead
): string {
  const n = (value: number) => value.toFixed(1)
  const distance = Math.hypot(end.x - start.x, end.y - start.y) || 1
  const slack = Math.max(0, 1 - distance / reach)
  const hasMeter = meter.bottom > 0
  const wrapsMeter = hasMeter && end.x < meter.left - 6 && end.y < start.y - 24

  if (wrapsMeter) {
    // The lead hangs off the front edge, clears the controls, then climbs to
    // the component at the far left of the bench.
    const drop = 16 + 22 * slack + (lead === "red" ? 8 : 0)
    const exit = meter.bottom + drop
    const corner = meter.left - 24
    const c1x = start.x
    const c1y = start.y + drop
    const c2x = start.x - 34
    const c2y = exit
    const c3x = corner - 46
    const c3y = exit
    const c4x = end.x + 52
    const c4y = end.y + 104
    return `M ${n(start.x)} ${n(start.y)} C ${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(corner)} ${n(exit)} C ${n(c3x)} ${n(c3y)} ${n(c4x)} ${n(c4y)} ${n(end.x)} ${n(end.y)}`
  }

  const sag = 14 + 145 * slack
  const c1x = start.x + (end.x - start.x) * 0.08
  const c1y = start.y + 58
  const c2x = start.x + (end.x - start.x) * 0.7
  const c2y = start.y + (end.y - start.y) * 0.28 + sag
  return `M ${n(start.x)} ${n(start.y)} C ${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(end.x)} ${n(end.y)}`
}

const LEADS = ["red", "black"] as const
const ROPE_STEP = 1 / 60
const ROPE_GRAVITY = 1500
const ROPE_DAMPING = 0.7
const ROPE_PASSES = 18

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

interface RopePoint extends Point {
  px: number
  py: number
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const update = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

function ropeSegments(reach: number) {
  return clamp(Math.round(reach / 18), 32, 72)
}

function makeRope(jack: Point, end: Point, reach: number): RopePoint[] {
  const segments = ropeSegments(reach)
  const dx = end.x - jack.x
  const dy = end.y - jack.y
  const chord = Math.hypot(dx, dy) || 1
  const excess = Math.max(0, reach - chord)
  const sag = Math.min(chord * 0.42, Math.sqrt((3 * chord * excess) / 8))
  const points: RopePoint[] = []
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const x = jack.x + dx * t
    const y = jack.y + dy * t + Math.sin(Math.PI * t) * sag
    points.push({ x, y, px: x, py: y })
  }
  return points
}

/** One fixed-step Verlet pass: gravity, then length and pin constraints. */
function stepRope(points: RopePoint[], jack: Point, end: Point, reach: number) {
  const last = points.length - 1
  const gravity = ROPE_GRAVITY * ROPE_STEP * ROPE_STEP

  for (let index = 1; index < last; index += 1) {
    const point = points[index]
    const vx = (point.x - point.px) * ROPE_DAMPING
    const vy = (point.y - point.py) * ROPE_DAMPING
    point.px = point.x
    point.py = point.y
    point.x += vx
    point.y += vy + gravity
  }

  const rest = reach / last
  for (let pass = 0; pass < ROPE_PASSES; pass += 1) {
    for (let index = 0; index < last; index += 1) {
      const a = points[index]
      const b = points[index + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.hypot(dx, dy) || 0.0001
      const diff = (distance - rest) / distance
      const aPinned = index === 0
      const bPinned = index + 1 === last
      if (aPinned && bPinned) continue
      const wa = aPinned ? 0 : bPinned ? 1 : 0.5
      const wb = bPinned ? 0 : aPinned ? 1 : 0.5
      a.x += dx * diff * wa
      a.y += dy * diff * wa
      b.x -= dx * diff * wb
      b.y -= dy * diff * wb
    }
    points[0].x = jack.x
    points[0].y = jack.y
    points[last].x = end.x
    points[last].y = end.y
  }

  // Static friction: a lead lying on the bench stops instead of creeping.
  for (let index = 1; index < last; index += 1) {
    const point = points[index]
    if (Math.hypot(point.x - point.px, point.y - point.py) < 0.09) {
      point.px = point.x
      point.py = point.y
    }
  }
}

/** One round of Chaikin corner cutting, so tension kinks read as a bend. */
function smoothRope(points: RopePoint[]): Point[] {
  if (points.length < 3) return points
  const next: Point[] = [points[0]]
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]
    const b = points[index + 1]
    const cut = {
      x: a.x * 0.75 + b.x * 0.25,
      y: a.y * 0.75 + b.y * 0.25,
    }
    const cut2 = {
      x: a.x * 0.25 + b.x * 0.75,
      y: a.y * 0.25 + b.y * 0.75,
    }
    next.push(cut, cut2)
  }
  next.push(points[points.length - 1])
  return next
}

/** Catmull-Rom through the rope samples, emitted as cubic segments. */
function ropePath(points: Point[]) {
  const n = (value: number) => value.toFixed(1)
  const count = points.length
  let d = `M ${n(points[0].x)} ${n(points[0].y)}`
  for (let index = 0; index < count - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(count - 1, index + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(p2.x)} ${n(p2.y)}`
  }
  return d
}

export function CableLayer({ bench }: { bench: ReturnType<typeof useProbes> }) {
  const { probes, geometry } = bench
  const reduced = usePrefersReducedMotion()
  const baseRefs = useRef<Partial<Record<Lead, SVGPathElement | null>>>({})
  const shineRefs = useRef<Partial<Record<Lead, SVGPathElement | null>>>({})
  const probesRef = useRef(probes)
  probesRef.current = probes
  const wakeRef = useRef<(() => void) | null>(null)

  const paint = useCallback((paths: Record<Lead, string>) => {
    for (const lead of LEADS) {
      baseRefs.current[lead]?.setAttribute("d", paths[lead])
      shineRefs.current[lead]?.setAttribute("d", paths[lead])
    }
  }, [])

  // The leads behave like weighted cable: the jack end is fixed, the probe end
  // follows the hand, and the rest of the run lags, sags and settles.
  useIsomorphicLayoutEffect(() => {
    if (!geometry || reduced) return
    const ropes = {
      red: makeRope(geometry.jacks.red, buttOf(probesRef.current.red, "red"), geometry.reach.red),
      black: makeRope(
        geometry.jacks.black,
        buttOf(probesRef.current.black, "black"),
        geometry.reach.black
      ),
    }

    const draw = () =>
      paint({
        red: ropePath(smoothRope(ropes.red)),
        black: ropePath(smoothRope(ropes.black)),
      })
    draw()

    const previous = {
      red: ropes.red.map((point) => ({ x: point.x, y: point.y })),
      black: ropes.black.map((point) => ({ x: point.x, y: point.y })),
    }
    const freePoints = ropes.red.length + ropes.black.length - 4
    let frameId = 0
    let running = false
    let lastTime = 0
    let accumulator = 0
    const frame = (now: number) => {
      accumulator = Math.min(accumulator + (now - lastTime) / 1000, ROPE_STEP * 3)
      lastTime = now
      let stepped = 0
      while (accumulator >= ROPE_STEP && stepped < 3) {
        stepRope(
          ropes.red,
          geometry.jacks.red,
          buttOf(probesRef.current.red, "red"),
          geometry.reach.red
        )
        stepRope(
          ropes.black,
          geometry.jacks.black,
          buttOf(probesRef.current.black, "black"),
          geometry.reach.black
        )
        accumulator -= ROPE_STEP
        stepped += 1
      }
      if (stepped === 3) accumulator = 0
      if (stepped) draw()

      let drift = 0
      for (const lead of LEADS) {
        const points = ropes[lead]
        const last = points.length - 2
        for (let index = 1; index <= last; index += 1) {
          drift += Math.abs(points[index].x - previous[lead][index].x)
          drift += Math.abs(points[index].y - previous[lead][index].y)
          previous[lead][index].x = points[index].x
          previous[lead][index].y = points[index].y
        }
      }
      // Once the cable stops moving, park the loop until it is disturbed again.
      ;(window as unknown as { __cableDrift?: number }).__cableDrift = drift / freePoints
      if (stepped && drift / freePoints < 0.02) {
        running = false
        return
      }
      frameId = requestAnimationFrame(frame)
    }
    const wake = () => {
      if (running) return
      running = true
      lastTime = performance.now()
      accumulator = 0
      frameId = requestAnimationFrame(frame)
    }
    wakeRef.current = wake
    wake()
    return () => {
      wakeRef.current = null
      running = false
      cancelAnimationFrame(frameId)
    }
  }, [geometry, reduced, paint])

  useIsomorphicLayoutEffect(() => {
    wakeRef.current?.()
  }, [probes])

  // With reduced motion the leads are still drawn, just without the swing.
  useIsomorphicLayoutEffect(() => {
    if (!geometry || !reduced) return
    paint({
      red: cablePath(
        geometry.jacks.red,
        buttOf(probes.red, "red"),
        geometry.reach.red,
        geometry.meter,
        "red"
      ),
      black: cablePath(
        geometry.jacks.black,
        buttOf(probes.black, "black"),
        geometry.reach.black,
        geometry.meter,
        "black"
      ),
    })
  }, [geometry, reduced, probes, paint])

  return (
    <div className="cable-layer" data-ready={geometry ? "true" : "false"} aria-hidden="true">
      {geometry ? (
        <svg
          className="wiring"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          {LEADS.map((lead) => (
            <g key={lead} className={`wire-group wire-group--${lead}`}>
              <path
                ref={(element) => {
                  baseRefs.current[lead] = element
                }}
                className={`wire wire--${lead}`}
              />
              <path
                ref={(element) => {
                  shineRefs.current[lead] = element
                }}
                className="wire wire--shine"
              />
            </g>
          ))}
        </svg>
      ) : null}
    </div>
  )
}

export function ProbeLayer({ bench }: { bench: ReturnType<typeof useProbes> }) {
  const { probes, geometry, dragging, hot, beginDrag, moveDrag, endDrag, clickLead, cycleLead } =
    bench

  return (
    <div
      className="probe-layer"
      data-ready={geometry ? "true" : "false"}
      data-dragging={dragging ?? "none"}
    >
      {(["red", "black"] as const).map((lead) => {
        const probe = probes[lead]
        const taut =
          geometry !== null &&
          Math.hypot(
            probe.x - geometry.jacks[lead].x,
            probe.y - geometry.jacks[lead].y
          ) >= geometry.reach[lead] - 2
        return (
          <Button
            key={lead}
            className={`probe-button probe-button--${lead}`}
            style={
              {
                left: `${probe.x}px`,
                top: `${probe.y}px`,
                "--probe-angle": `${PROBE_TILT[lead]}deg`,
              } as React.CSSProperties
            }
            aria-label={`${lead === "red" ? "Red" : "Black"} probe, ${contactLabel(
              probe.contact
            )}`}
            aria-describedby="probe-help"
            data-contact={probe.contact ? contactKey(probe.contact) : "free"}
            data-dragging={dragging === lead ? "true" : "false"}
            data-taut={taut ? "true" : "false"}
            data-hot={hot && probe.contact === null ? "true" : "false"}
            onPointerDown={beginDrag(lead)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
              event.preventDefault()
              cycleLead(lead, event.key === "ArrowRight" ? 1 : -1)
            }}
            onClick={clickLead(lead)}
          >
            <span className="probe-button__grip" aria-hidden="true" />
            <span className="probe-button__neck" aria-hidden="true" />
            <span className="probe-button__tip" aria-hidden="true" />
          </Button>
        )
      })}

      <p className="sr-only" id="probe-help">
        The probe is wired to the meter by a fixed lead. Drag it onto a component
        post. With the probe focused, press the left or right arrow key to step
        through the test points.
      </p>
    </div>
  )
}
