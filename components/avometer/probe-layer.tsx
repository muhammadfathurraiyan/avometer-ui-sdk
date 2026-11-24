"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  meter: { left: number; bottom: number }
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

export function CableLayer({ bench }: { bench: ReturnType<typeof useProbes> }) {
  const { probes, geometry } = bench

  return (
    <div className="cable-layer" data-ready={geometry ? "true" : "false"} aria-hidden="true">
      {geometry ? (
        <svg
          className="wiring"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          {(["black", "red"] as const).map((lead) => {
            const probe = probes[lead]
            const d = cablePath(
              geometry.jacks[lead],
              buttOf(probe, lead),
              geometry.reach[lead],
              geometry.meter,
              lead
            )
            return (
              <g key={lead} className={`wire-group wire-group--${lead}`}>
                <path d={d} className={`wire wire--${lead}`} />
                <path d={d} className="wire wire--shine" />
              </g>
            )
          })}
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
            aria-describedby="probe-help bench-hint"
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
