"use client"

import { useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import {
  Slider,
  SliderControl,
  SliderThumb,
  SliderTrack,
} from "@ui-sdk/react/slider"

const ZERO_MIN = 0
const ZERO_MAX = 2
const ZERO_STEP = 0.01
const ZERO_SWEEP = 270
const ZERO_START = -135

function angleDelta(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ZeroAdjust({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const knobRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    lastRaw: number
    value: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  const angle = ZERO_START + ((value - ZERO_MIN) / (ZERO_MAX - ZERO_MIN)) * ZERO_SWEEP

  const rawAngleAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = knobRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90
  }

  const beginTurn = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const input = event.currentTarget.querySelector<HTMLInputElement>(
      'input[role="slider"]'
    )
    input?.focus({ preventScroll: true })
    dragRef.current = {
      pointerId: event.pointerId,
      lastRaw: rawAngleAt(event),
      value,
    }
    setDragging(true)
  }

  const turn = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const raw = rawAngleAt(event)
    drag.value = clamp(
      drag.value + (angleDelta(drag.lastRaw, raw) / ZERO_SWEEP) * (ZERO_MAX - ZERO_MIN),
      ZERO_MIN,
      ZERO_MAX
    )
    drag.lastRaw = raw
    onChange(
      Number((Math.round(drag.value / ZERO_STEP) * ZERO_STEP).toFixed(2))
    )
  }

  const endTurn = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    setDragging(false)
  }

  return (
    <div className="dial-zero">
      <span className="dial-zero__label" aria-hidden="true">
        0Ω adj
      </span>

      <div
        ref={knobRef}
        className="dial-zero__knob"
        onPointerDown={beginTurn}
        onPointerMove={turn}
        onPointerUp={endTurn}
        onPointerCancel={endTurn}
        data-dragging={dragging ? "true" : "false"}
        title="Drag to adjust the ohms zero"
      >
        <span
          className="dial-zero__slot"
          aria-hidden="true"
          style={{ "--zero-angle": `${angle}deg` } as CSSProperties}
        />
        <Slider
          value={value}
          min={ZERO_MIN}
          max={ZERO_MAX}
          step={ZERO_STEP}
          onValueChange={(next) => {
            if (typeof next === "number") onChange(next)
          }}
        >
          <SliderControl className="dial-zero__a11y">
            <SliderTrack className="dial-zero__a11y-track">
              <SliderThumb className="dial-zero__a11y-thumb" aria-label="Zero adjust" />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </div>
    </div>
  )
}
