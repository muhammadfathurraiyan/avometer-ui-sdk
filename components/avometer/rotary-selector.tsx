"use client"

import { useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import { Radio, RadioGroup, RadioIndicator } from "@ui-sdk/react/radio"
import type { DialPosition } from "@/lib/measurement"

const SWEEP = 340
const START = 0

/** Shortest signed distance between two angles, in degrees. */
function angleDelta(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function RotarySelector({
  value,
  positions,
  onChange,
}: {
  value: string
  positions: DialPosition[]
  onChange: (id: string) => void
}) {
  const dialRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    lastRaw: number
    angle: number
  } | null>(null)
  const [dragAngle, setDragAngle] = useState<number | null>(null)

  const step = SWEEP / (positions.length - 1)
  const index = Math.max(
    0,
    positions.findIndex((position) => position.id === value)
  )
  const knobAngle = START - index * step

  /** Pointer position as a clock-face angle: 0° is up, clockwise positive. */
  const rawAngleAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = dialRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90
  }

  const selectAngle = (angle: number) => {
    const nextIndex = clamp(
      Math.round((START - angle) / step),
      0,
      positions.length - 1
    )
    const next = positions[nextIndex]
    if (next && next.id !== value) onChange(next.id)
  }

  const beginTurn = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      lastRaw: rawAngleAt(event),
      angle: knobAngle,
    }
    setDragAngle(knobAngle)
  }

  const turn = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const raw = rawAngleAt(event)
    drag.angle = clamp(
      drag.angle + angleDelta(drag.lastRaw, raw),
      START - SWEEP,
      START
    )
    drag.lastRaw = raw
    setDragAngle(drag.angle)
    selectAngle(drag.angle)
  }

  const endTurn = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    setDragAngle(null)
  }

  return (
    <div className="dial" ref={dialRef}>
      <div
        className="dial__knob"
        style={{ "--knob-angle": `${dragAngle ?? knobAngle}deg` } as CSSProperties}
        onPointerDown={beginTurn}
        onPointerMove={turn}
        onPointerUp={endTurn}
        onPointerCancel={endTurn}
        data-dragging={dragAngle !== null ? "true" : "false"}
        title="Drag to turn the dial"
        data-testid="dial-knob"
      >
        <span className="dial__cap" />
        <span className="dial__pointer" />
        <span className="dial__grip" />
      </div>

      <RadioGroup
        aria-label="Function and range"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next)
        }}
        loop={false}
        className="dial__stops"
      >
        {positions.map((position, positionIndex) => {
          const angle = START - positionIndex * step
          const startsGroup =
            positionIndex === 0 ||
            positions[positionIndex - 1].group !== position.group
          const showTag = position.group !== "OFF" && startsGroup
          return (
            <Radio
              key={position.id}
              value={position.id}
              className="dial__stop"
              data-group={position.group}
              style={{ "--stop-angle": `${angle}deg` } as CSSProperties}
            >
              <RadioIndicator aria-hidden="true" />
              <span className="dial__print" aria-hidden="true">
                {showTag ? <span className="dial__tag">{position.group}</span> : null}
                <span className="dial__value">{position.short || "OFF"}</span>
              </span>
              <span className="sr-only">{position.name}</span>
            </Radio>
          )
        })}
      </RadioGroup>
    </div>
  )
}
