export type MeterFunction =
  | "off"
  | "dcv"
  | "acv"
  | "dca"
  | "ohm"
  | "diode"
  | "capacitance"
  | "hfe"

export interface DialPosition {
  id: string
  fn: MeterFunction
  /** Accessible name, also used to pick the position from an agent. */
  name: string
  /** What is printed next to the detent. */
  short: string
  group: string
  /** Full-scale value in display units. */
  fullScale: number
  /** Base unit to display unit, e.g. amps to milliamps. */
  factor: number
  unit: string
  decimals: number
  /** Mid-scale resistance for the ohms ranges, in ohms. */
  ohmMid?: number
}

const RANGES: DialPosition[] = [
  {
    id: "off",
    fn: "off",
    name: "Off",
    short: "",
    group: "OFF",
    fullScale: 1,
    factor: 1,
    unit: "",
    decimals: 0,
  },
  {
    id: "dcv-2.5",
    fn: "dcv",
    name: "DC volts 2.5",
    short: "2.5",
    group: "DC V",
    fullScale: 2.5,
    factor: 1,
    unit: "V",
    decimals: 3,
  },
  {
    id: "dcv-10",
    fn: "dcv",
    name: "DC volts 10",
    short: "10",
    group: "DC V",
    fullScale: 10,
    factor: 1,
    unit: "V",
    decimals: 2,
  },
  {
    id: "dcv-50",
    fn: "dcv",
    name: "DC volts 50",
    short: "50",
    group: "DC V",
    fullScale: 50,
    factor: 1,
    unit: "V",
    decimals: 2,
  },
  {
    id: "dcv-250",
    fn: "dcv",
    name: "DC volts 250",
    short: "250",
    group: "DC V",
    fullScale: 250,
    factor: 1,
    unit: "V",
    decimals: 1,
  },
  {
    id: "dcv-1000",
    fn: "dcv",
    name: "DC volts 1000",
    short: "1000",
    group: "DC V",
    fullScale: 1000,
    factor: 1,
    unit: "V",
    decimals: 0,
  },
  {
    id: "acv-10",
    fn: "acv",
    name: "AC volts 10",
    short: "10",
    group: "AC V",
    fullScale: 10,
    factor: 1,
    unit: "V",
    decimals: 2,
  },
  {
    id: "acv-50",
    fn: "acv",
    name: "AC volts 50",
    short: "50",
    group: "AC V",
    fullScale: 50,
    factor: 1,
    unit: "V",
    decimals: 1,
  },
  {
    id: "acv-250",
    fn: "acv",
    name: "AC volts 250",
    short: "250",
    group: "AC V",
    fullScale: 250,
    factor: 1,
    unit: "V",
    decimals: 0,
  },
  {
    id: "acv-1000",
    fn: "acv",
    name: "AC volts 1000",
    short: "1000",
    group: "AC V",
    fullScale: 1000,
    factor: 1,
    unit: "V",
    decimals: 0,
  },
  {
    id: "dca-5m",
    fn: "dca",
    name: "DC milliamps 5",
    short: "5",
    group: "DC mA",
    fullScale: 5,
    factor: 1000,
    unit: "mA",
    decimals: 2,
  },
  {
    id: "dca-500m",
    fn: "dca",
    name: "DC milliamps 500",
    short: "500",
    group: "DC mA",
    fullScale: 500,
    factor: 1000,
    unit: "mA",
    decimals: 0,
  },
  {
    id: "dca-10",
    fn: "dca",
    name: "DC amps 10",
    short: "10",
    group: "DC A",
    fullScale: 10,
    factor: 1,
    unit: "A",
    decimals: 2,
  },
  {
    id: "ohm-1",
    fn: "ohm",
    name: "Ohms times 1",
    short: "×1",
    group: "Ω",
    fullScale: 1,
    factor: 1,
    unit: "Ω",
    decimals: 0,
    ohmMid: 20,
  },
  {
    id: "ohm-100",
    fn: "ohm",
    name: "Ohms times 100",
    short: "×100",
    group: "Ω",
    fullScale: 1,
    factor: 1,
    unit: "Ω",
    decimals: 0,
    ohmMid: 2_000,
  },
  {
    id: "ohm-10k",
    fn: "ohm",
    name: "Ohms times 10k",
    short: "×10k",
    group: "Ω",
    fullScale: 1,
    factor: 1,
    unit: "Ω",
    decimals: 0,
    ohmMid: 200_000,
  },
  {
    id: "diode",
    fn: "diode",
    name: "Diode test",
    short: "2",
    group: "DIODE",
    fullScale: 2,
    factor: 1,
    unit: "V",
    decimals: 3,
  },
  {
    id: "capacitance",
    fn: "capacitance",
    name: "Capacitance 2000 microfarads",
    short: "2000",
    group: "CAP",
    fullScale: 2000,
    factor: 1,
    unit: "µF",
    decimals: 1,
  },
  {
    id: "hfe",
    fn: "hfe",
    name: "Transistor hFE 1000",
    short: "1000",
    group: "hFE",
    fullScale: 1000,
    factor: 1,
    unit: "",
    decimals: 0,
  },
]

/**
 * The physical order of the dial, running counter-clockwise from OFF at twelve
 * o'clock: ohms, capacitance, diode, hFE, current, AC volts, then DC volts back
 * up the right-hand side. The scale stops just short of a full turn.
 */
const DIAL_ORDER = [
  "off",
  "ohm-1",
  "ohm-100",
  "ohm-10k",
  "capacitance",
  "diode",
  "hfe",
  "dca-5m",
  "dca-500m",
  "dca-10",
  "acv-10",
  "acv-50",
  "acv-250",
  "acv-1000",
  "dcv-1000",
  "dcv-250",
  "dcv-50",
  "dcv-10",
  "dcv-2.5",
]

function rangeById(id: string) {
  const range = RANGES.find((position) => position.id === id)
  if (!range) throw new Error(`Unknown dial position: ${id}`)
  return range
}

export const DIAL_POSITIONS: DialPosition[] = DIAL_ORDER.map(rangeById)

export type SubjectKind =
  | "passive"
  | "diode"
  | "led"
  | "capacitor"
  | "battery"
  | "mains"
  | "transistor"
  | "open"
  | "short"

export interface Subject {
  id: string
  name: string
  spec: string
  kind: SubjectKind
  resistance?: number
  forwardDrop?: number
  forwardResistance?: number
  reverseLeakage?: number | null
  capacitance?: number
  hfe?: number
  dcVolts?: number
  acVolts?: number
  sourceOhms?: number
}

export const SUBJECTS: Subject[] = [
  {
    id: "resistor",
    name: "Carbon resistor",
    spec: "4.7 kΩ ±5%",
    kind: "passive",
    resistance: 4_700,
  },
  {
    id: "diode",
    name: "Silicon diode",
    spec: "1N4148",
    kind: "diode",
    forwardDrop: 0.617,
    forwardResistance: 1_400,
  },
  {
    id: "led",
    name: "Red LED",
    spec: "5 mm, 1.9 V",
    kind: "led",
    forwardDrop: 1.864,
    forwardResistance: 2_600,
  },
  {
    id: "capacitor",
    name: "Electrolytic capacitor",
    spec: "470 µF 25 V",
    kind: "capacitor",
    capacitance: 470,
  },
  {
    id: "cell",
    name: "AA cell",
    spec: "1.5 V alkaline",
    kind: "battery",
    dcVolts: 1.583,
    sourceOhms: 0.35,
  },
  {
    id: "mains",
    name: "Mains outlet",
    spec: "230 V ~ 50 Hz",
    kind: "mains",
    acVolts: 231.4,
  },
  {
    id: "transistor",
    name: "NPN transistor",
    spec: "2N3904",
    kind: "transistor",
    hfe: 218,
  },
  {
    id: "open",
    name: "Open terminals",
    spec: "no connection",
    kind: "open",
  },
  {
    id: "short",
    name: "Solder bridge",
    spec: "0 Ω link",
    kind: "short",
    resistance: 0.04,
  },
]

export type MeterNote = "live" | "over" | "range" | "leads" | null

export interface Measurement {
  /** In display units, null for an open or invalid reading. */
  value: number | null
  text: string
  spoken: string
  over: boolean
  /** 0 to 1 of full scale, used by the simulation tests. */
  deflection: number
  continuity: boolean
  note: MeterNote
}

export interface MeasureOptions {
  zeroOffset?: number
  probesReversed?: boolean
  /** Time since the probes touched the subject, for capacitors. */
  capacitanceMs?: number
  /** A lead is off its pad, so no complete circuit exists. */
  openLeads?: boolean
}

const UNIT_NAMES: Record<string, string> = {
  V: "volts",
  mA: "milliamps",
  A: "amps",
  Ω: "ohms",
  "µF": "microfarads",
  "": "",
}

function resistanceOf(subject: Subject, reversed: boolean): number | null {
  switch (subject.kind) {
    case "passive":
    case "short":
      return subject.resistance ?? null
    case "diode":
    case "led":
      return reversed
        ? (subject.reverseLeakage ?? null)
        : (subject.forwardResistance ?? null)
    case "capacitor":
    case "battery":
    case "mains":
    case "transistor":
    case "open":
      return null
  }
}

export function formatOhms(ohms: number): string {
  if (ohms < 1) return `${ohms.toFixed(2)} Ω`
  if (ohms < 1_000) return `${ohms.toFixed(ohms < 100 ? 1 : 0)} Ω`
  if (ohms < 1_000_000) return `${(ohms / 1_000).toFixed(2)} kΩ`
  return `${(ohms / 1_000_000).toFixed(2)} MΩ`
}

export function spokenOhms(ohms: number): string {
  if (ohms < 1) return `${ohms.toFixed(2)} ohms`
  if (ohms < 1_000) return `${Math.round(ohms)} ohms`
  if (ohms < 1_000_000) return `${(ohms / 1_000).toFixed(2)} kilohms`
  return `${(ohms / 1_000_000).toFixed(2)} megohms`
}

export function measure(
  subject: Subject,
  position: DialPosition,
  options: MeasureOptions = {}
): Measurement {
  const {
    zeroOffset = 0,
    probesReversed = false,
    capacitanceMs = 0,
    openLeads = false,
  } = options

  const off: Measurement = {
    value: null,
    text: "",
    spoken: "Instrument off",
    over: false,
    deflection: 0,
    continuity: false,
    note: null,
  }

  if (position.fn === "off") return off

  if (openLeads) {
    if (position.fn === "ohm" || position.fn === "diode" || position.fn === "hfe") {
      return {
        value: null,
        text: "O.L",
        spoken: "Open circuit",
        over: false,
        deflection: 0,
        continuity: false,
        note: "leads",
      }
    }
    const spokenUnit = UNIT_NAMES[position.unit] ?? position.unit
    return {
      value: 0,
      text: `${(0).toFixed(position.decimals)} ${position.unit}`.trim(),
      spoken: `No connection, zero ${spokenUnit}`.trim(),
      over: false,
      deflection: 0,
      continuity: false,
      note: "leads",
    }
  }

  if (position.fn === "ohm") {
    const raw = resistanceOf(subject, probesReversed)
    const live = subject.kind === "battery" || subject.kind === "mains"
    if (raw === null) {
      return {
        value: null,
        text: "O.L",
        spoken: "Open circuit",
        over: false,
        deflection: 0,
        continuity: false,
        note: live ? "live" : null,
      }
    }
    const ohms = Math.max(0, raw - zeroOffset)
    const mid = position.ohmMid ?? 20
    const deflection = mid / (mid + ohms)
    return {
      value: ohms,
      text: formatOhms(ohms),
      spoken: spokenOhms(ohms),
      over: false,
      deflection,
      continuity: ohms <= 30,
      note: deflection < 0.06 ? "range" : live ? "live" : null,
    }
  }

  let base: number | null
  switch (position.fn) {
    case "dcv": {
      const volts = subject.dcVolts ?? 0
      base = probesReversed && volts !== 0 ? -volts : volts
      break
    }
    case "acv":
      base = subject.acVolts ?? 0
      break
    case "dca": {
      const source = subject.dcVolts ?? 0
      const ampsFullScale = position.fullScale / position.factor
      const burden = 0.5 / ampsFullScale
      const amps =
        source === 0
          ? 0
          : source / ((subject.sourceOhms ?? 0.25) + burden)
      base = probesReversed ? -amps : amps
      break
    }
    case "diode": {
      if (subject.kind === "diode" || subject.kind === "led") {
        base = probesReversed ? null : (subject.forwardDrop ?? null)
      } else if (subject.kind === "short") {
        base = 0.002
      } else if (subject.kind === "battery") {
        base = probesReversed ? null : (subject.dcVolts ?? null)
      } else if (subject.kind === "mains") {
        base = subject.acVolts ?? null
      } else {
        base = null
      }
      break
    }
    case "capacitance": {
      if (subject.kind === "capacitor") {
        const charge = 1 - Math.exp(-capacitanceMs / 700)
        base = (subject.capacitance ?? 0) * charge
      } else if (subject.kind === "battery" || subject.kind === "mains") {
        base = null
      } else {
        base = 0
      }
      break
    }
    case "hfe":
      base = subject.kind === "transistor" ? (subject.hfe ?? null) : null
      break
    default:
      base = null
  }

  if (base === null) {
    return {
      value: null,
      text: "O.L",
      spoken: "Open circuit",
      over: false,
      deflection: 0,
      continuity: false,
      note: null,
    }
  }

  const value = base * position.factor
  const over = Math.abs(value) > position.fullScale
  const deflection = over
    ? 1
    : Math.max(0, Math.min(1, value / position.fullScale))

  const text = over
    ? "O.L"
    : position.fn === "hfe"
      ? String(Math.round(value))
      : `${value.toFixed(position.decimals)} ${position.unit}`.trim()

  const spoken = over
    ? "Overload"
    : position.fn === "hfe"
      ? `h F E ${Math.round(value)}`
      : `${value.toFixed(position.decimals)} ${UNIT_NAMES[position.unit] ?? position.unit}`.trim()

  return {
    value,
    text,
    spoken,
    over,
    deflection,
    continuity: false,
    note: over ? "over" : null,
  }
}

export function positionById(id: string): DialPosition {
  return DIAL_POSITIONS.find((position) => position.id === id) ?? DIAL_POSITIONS[0]
}

export function subjectById(id: string): Subject {
  return SUBJECTS.find((subject) => subject.id === id) ?? SUBJECTS[0]
}
