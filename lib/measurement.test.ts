import { expect, test } from "vitest"
import {
  measure,
  positionById,
  subjectById,
  type MeasureOptions,
} from "./measurement"

function read(subjectId: string, positionId: string, options?: MeasureOptions) {
  return measure(subjectById(subjectId), positionById(positionId), options)
}

test("a fresh AA cell reads 1.583 V on the 2.5 V DC range", () => {
  const reading = read("cell", "dcv-2.5")
  expect(reading.value).toBeCloseTo(1.583, 3)
  expect(reading.text).toBe("1.583 V")
  expect(reading.over).toBe(false)
  expect(reading.deflection).toBeCloseTo(1.583 / 2.5, 3)
})

test("the same cell reads negative with the probes reversed", () => {
  const reading = read("cell", "dcv-2.5", { probesReversed: true })
  expect(reading.value).toBeCloseTo(-1.583, 3)
  expect(reading.text).toBe("-1.583 V")
  expect(reading.deflection).toBe(0)
})

test("the cell draws about 4 A through the 10 A shunt", () => {
  const reading = read("cell", "dca-10")
  expect(reading.value).toBeGreaterThan(3.5)
  expect(reading.value).toBeLessThan(4.5)
  expect(reading.over).toBe(false)
  expect(reading.text.endsWith(" A")).toBe(true)
})

test("the cell overloads the 500 mA range", () => {
  const reading = read("cell", "dca-500m")
  expect(reading.over).toBe(true)
  expect(reading.text).toBe("O.L")
})

test("mains reads 231 V only on AC ranges", () => {
  expect(read("mains", "acv-250").value).toBeCloseTo(231.4, 1)
  expect(read("mains", "dcv-250").value).toBe(0)
})

test("a 4.7 kΩ resistor crowds the ×1 range but reads cleanly on ×10k", () => {
  const low = read("resistor", "ohm-1")
  const high = read("resistor", "ohm-10k")
  expect(low.value).toBeCloseTo(4_700, 0)
  expect(low.deflection).toBeLessThan(0.02)
  expect(low.note).toBe("range")
  expect(high.deflection).toBeGreaterThan(0.9)
})

test("resistance is trimmed by the zero adjustment", () => {
  const reading = read("resistor", "ohm-100", { zeroOffset: 0.7 })
  expect(reading.value).toBeCloseTo(4_699.3, 1)
})

test("open and live circuits read open", () => {
  expect(read("open", "ohm-100").text).toBe("O.L")
  expect(read("open", "ohm-100").note).toBeNull()
  expect(read("cell", "ohm-100").text).toBe("O.L")
  expect(read("cell", "ohm-100").note).toBe("live")
})

test("continuity closes only below 30 Ω", () => {
  expect(read("short", "ohm-1").continuity).toBe(true)
  expect(read("resistor", "ohm-100").continuity).toBe(false)
})

test("a silicon diode conducts one way", () => {
  expect(read("diode", "diode").text).toBe("0.617 V")
  expect(read("diode", "diode", { probesReversed: true }).text).toBe("O.L")
})

test("a capacitor charges towards its value", () => {
  const atStart = read("capacitor", "capacitance", { capacitanceMs: 0 })
  const settled = read("capacitor", "capacitance", { capacitanceMs: 6_000 })
  expect(atStart.value).toBe(0)
  expect(settled.value).toBeGreaterThan(465)
  expect(settled.text.endsWith("µF")).toBe(true)
  expect(settled.over).toBe(false)
})

test("hFE reads the transistor's gain", () => {
  expect(read("transistor", "hfe").text).toBe("218")
  expect(read("resistor", "hfe").text).toBe("O.L")
})

test("the off detent leaves the meter blank", () => {
  const reading = read("cell", "off")
  expect(reading.text).toBe("")
  expect(reading.value).toBeNull()
  expect(reading.deflection).toBe(0)
})
