"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "@ui-sdk/react/slider"
import { Switch, SwitchThumb } from "@ui-sdk/react/switch"
import { Toggle } from "@ui-sdk/react/toggle"
import {
  DIAL_POSITIONS,
  measure,
  positionById,
  subjectById,
  type Measurement,
  type Subject,
} from "@/lib/measurement"
import { registerMeterTools } from "@/lib/agent"
import { BenchItems } from "./bench-items"
import { DigitalReadout } from "./digital-readout"
import { CableLayer, contactKey, ProbeLayer, useProbes, type Contact } from "./probe-layer"
import { RotarySelector } from "./rotary-selector"

const SHORTED_PROBES: Subject = {
  id: "shorted",
  name: "Shorted probes",
  spec: "both probes on one post",
  kind: "short",
  resistance: 0.02,
}

function useContinuityBuzzer(active: boolean) {
  useEffect(() => {
    if (!active) return
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass()
    void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = "square"
    oscillator.frequency.value = 920
    gain.gain.value = 0.03
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()

    return () => {
      oscillator.stop()
      void context.close()
    }
  }, [active])
}

function statusFor(
  powered: boolean,
  measurement: Measurement,
  underTest: Subject | null,
  positionId: string,
  redContact: Contact | null,
  blackContact: Contact | null
) {
  if (!powered) return "Instrument off. Switch on to measure."
  if (!redContact || !blackContact)
    return "Clip both probes to a component's posts to close the circuit."
  if (redContact.itemId !== blackContact.itemId)
    return "The probes are on different components. Put both on the same one."
  if (redContact.side === blackContact.side)
    return "Both probes on one post — that is a short. Use the two posts of a component."
  if (underTest?.kind === "mains")
    return "Live mains at the probes. Keep clear — demonstration only."
  if (measurement.note === "over") return "Over range. Step up to the next range."
  if (measurement.note === "live")
    return "Live circuit. The ohmmeter cannot read resistance here."
  if (measurement.note === "range")
    return "Reading is below 6% of full scale. Step up the ohms range."
  if (measurement.continuity) return "Continuity: the circuit is closed."
  if (positionId.startsWith("ohm-") && measurement.value === null)
    return "Open circuit across the probes."
  if (positionId === "capacitance")
    return "Charging the capacitor. The reading climbs to its value."
  return `Probes are across the ${underTest?.name ?? "component"}.`
}

export function Avometer() {
  const [positionId, setPositionId] = useState("dcv-2.5")
  const [powered, setPowered] = useState(true)
  const [held, setHeld] = useState(false)
  const [frozen, setFrozen] = useState<Measurement | null>(null)
  const [buzzer, setBuzzer] = useState(false)
  const [zero, setZero] = useState(0.35)
  // Time is read in effects so the prerendered HTML is deterministic.
  const [clock, setClock] = useState(0)
  const [connectedAt, setConnectedAt] = useState(0)
  const sceneRef = useRef<HTMLDivElement>(null)
  const bench = useProbes(sceneRef)

  const position = positionById(positionId)
  const redContact = bench.probes.red.contact
  const blackContact = bench.probes.black.contact
  const sameItem =
    redContact !== null && blackContact !== null && redContact.itemId === blackContact.itemId
  const shorted = sameItem && redContact.side === blackContact.side
  const connected = sameItem && !shorted
  const underTest = sameItem && redContact ? subjectById(redContact.itemId) : null
  const measureSubject = shorted ? SHORTED_PROBES : underTest ?? subjectById("open")
  const reversed = connected && redContact?.side === "minus"
  const contactSignature = `${redContact ? contactKey(redContact) : "-"}|${
    blackContact ? contactKey(blackContact) : "-"
  }`

  useEffect(() => {
    const now = Date.now()
    setConnectedAt(now)
    setClock(now)
    setFrozen(null)
    setHeld(false)
  }, [positionId, contactSignature])

  useEffect(() => {
    if (!powered) return
    setClock(Date.now())
    const interval = window.setInterval(() => setClock(Date.now()), 220)
    return () => window.clearInterval(interval)
  }, [powered])

  useEffect(() => registerMeterTools(), [])

  const measurement = useMemo(() => {
    if (!powered) {
      return {
        value: null,
        text: "",
        spoken: "Instrument off",
        over: false,
        deflection: 0,
        continuity: false,
        note: null,
      } satisfies Measurement
    }
    const capacitanceMs =
      position.fn === "capacitance" ? Math.max(0, clock - connectedAt) : 0
    return measure(measureSubject, position, {
      zeroOffset: zero,
      probesReversed: reversed,
      capacitanceMs,
      openLeads: !connected && !shorted,
    })
  }, [
    powered,
    measureSubject,
    position,
    zero,
    reversed,
    connected,
    shorted,
    clock,
    connectedAt,
  ])

  const shown = held && frozen ? frozen : measurement
  const beeping = buzzer && powered && measurement.continuity
  useContinuityBuzzer(beeping)

  return (
    <div className="bench-page">
      <div className="bench-page__head">
        <div>
          <p className="bench-page__eyebrow">AVO DM-850 · Bench 04</p>
          <h1 className="bench-page__title">Digital multimeter</h1>
        </div>
        <p className="bench-page__note">
          Nine components are set out on the bench. The probes are wired into the
          meter — drag them onto a component's posts and read the display. Turn the
          dial by dragging its knob.
        </p>
      </div>

      <div className="workshop" ref={sceneRef}>
        <CableLayer bench={bench} />
        <BenchItems probes={bench.probes} hot={bench.hot} onClip={bench.clipToItem} />

        <article className="avometer" aria-label="AVO DM-850 digital multimeter">
          <div className="avometer__bumper" aria-hidden="true" />

          <div className="avometer__face">
            <div className="dmm-head">
              <span className="dmm-brand">AVO</span>
              <span className="dmm-model">DM-850</span>
            </div>

            <div className="dmm-screen">
              <DigitalReadout
                measurement={shown}
                position={position}
                powered={powered}
                held={held}
              />
              <span className="dmm-screen__glare" aria-hidden="true" />
            </div>

            <div className="dmm-buttons">
              <Toggle
                className="dmm-button dmm-button--hold"
                pressed={held}
                onPressedChange={(pressed) => {
                  setHeld(pressed)
                  setFrozen(pressed ? measurement : null)
                }}
              >
                Hold
              </Toggle>
              <Toggle
                className="dmm-button dmm-button--power"
                pressed={powered}
                onPressedChange={setPowered}
              >
                <span className="dmm-button__lamp" data-on={powered ? "true" : "false"} />
                Power
              </Toggle>
              <span className="dmm-auto" aria-hidden="true">
                Auto power off
              </span>
              <label className="dmm-beep">
                <Switch checked={buzzer} onCheckedChange={setBuzzer}>
                  <SwitchThumb />
                </Switch>
                <span className="dmm-beep__text">Buzzer</span>
                <span className="dmm-beep__lamp" data-on={beeping ? "true" : "false"} />
              </label>
            </div>

            <p className="dmm-status" role="status">
              {statusFor(powered, measurement, underTest, positionId, redContact, blackContact)}
            </p>

            <div className="dmm-dial">
              <RotarySelector
                value={positionId}
                positions={DIAL_POSITIONS}
                onChange={setPositionId}
              />
            </div>

            <div className="dmm-trim">
              <div className="zero">
                <div className="zero__head">
                  <span>Ω zero</span>
                  <span className="zero__value">{zero.toFixed(2)} Ω</span>
                </div>
                <Slider
                  value={zero}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(value) => {
                    if (typeof value === "number") setZero(value)
                  }}
                >
                  <SliderControl className="zero__control">
                    <SliderTrack className="zero__track">
                      <SliderIndicator className="zero__indicator" />
                      <SliderThumb className="zero__thumb" aria-label="Zero adjust" />
                    </SliderTrack>
                  </SliderControl>
                </Slider>
              </div>
            </div>

            <div className="dmm-foot" aria-hidden="true">
              <span>AVO LTD · DOVER</span>
              <span>600 V CAT II</span>
              <span className="avometer__sticker">CAL 03/26</span>
            </div>

            <div className="avometer__terminals">
              <div className="jacks" aria-hidden="true">
                <div className="jack">
                  <span className="jack__label">10 A</span>
                  <span className="jack__socket jack__socket--10a" />
                  <span className="jack__note">Max 10 A</span>
                </div>
                <div className="jack">
                  <span className="jack__label">COM</span>
                  <span className="jack__socket jack__socket--black" data-jack="black" />
                  <span className="jack__note">Common</span>
                </div>
                <div className="jack">
                  <span className="jack__label">VΩmA</span>
                  <span className="jack__socket jack__socket--red" data-jack="red" />
                  <span className="jack__note">Max 1000 V</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <ProbeLayer bench={bench} />
      </div>
    </div>
  )
}
