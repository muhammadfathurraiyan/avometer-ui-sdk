"use client"

import type { Measurement, DialPosition } from "@/lib/measurement"

export function DigitalReadout({
  measurement,
  position,
  powered,
  held,
  zero,
}: {
  measurement: Measurement
  position: DialPosition
  powered: boolean
  held: boolean
  zero: number
}) {
  const text = powered ? measurement.text || "----" : ""
  const flags = [
    held ? "H" : "",
    measurement.over && powered ? "O.L" : "",
  ].filter(Boolean)

  return (
    <div
      className="readout"
      data-powered={powered ? "true" : "false"}
      data-over={measurement.over ? "true" : "false"}
      role="group"
      aria-label={`Digital reading: ${
        powered ? measurement.spoken : "instrument off"
      }${held ? ", held" : ""}`}
    >
      <div className="readout__bar">
        <span className="readout__mode">
          {powered && position.fn !== "off"
            ? `${position.group} ${position.short}`
            : "—"}
        </span>
        <span className="readout__flags" aria-hidden="true">
          {flags.join(" ")}
        </span>
      </div>
      <div className="readout__digits" aria-hidden="true">
        {text}
      </div>
      <div className="readout__bar readout__bar--foot" aria-hidden="true">
        <span>MANUAL RANGE</span>
        <span className="readout__zero">ZERO {zero.toFixed(2)} Ω</span>
        <span>AUTO OFF</span>
      </div>
    </div>
  )
}
