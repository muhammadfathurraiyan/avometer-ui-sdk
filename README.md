# AVO DM-850 — digital multimeter simulator

A working bench simulation of a handheld digital multimeter, built with
[ui-sdk](https://ui-sdk.dev) (`@ui-sdk/react` + `@ui-sdk/core`) on Next.js. The
meter borrows its look from an AVO DM-850: orange over-moulded case, three jacks
along the bottom edge, a large LCD and a 19-detent range dial.

Nine components are laid out on the wooden bench. Plug the probes onto their
posts, choose a range, and read the display. Everything is simulated — there is
no hardware — but the readings behave the way the instrument would.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test          # vitest: simulation + component + agent checks
npm run typecheck # tsc --noEmit
npm run build     # production build
```

## What is on the bench

- **19-detent function selector** — off, DC volts (2.5 / 10 / 50 / 250 / 1000),
  AC volts (10 / 50 / 250 / 1000), DC current (5 mA / 500 mA / 10 A), ohms
  (×1 / ×100 / ×10k), diode test, capacitance, transistor hFE. The scale runs
  just short of a full turn, with OFF at twelve o'clock and the ohms ranges
  down the left side. Drag the black knob to turn it, or click a printed range.
  The selector is a `radiogroup`; every detent is a named `radio`, so arrow keys
  and screen readers work.
- **3½-digit LCD** — the reading is the primary display. The readout group carries
  a spoken label such as “Digital reading: 1.583 volts”, and the digits themselves
  are decorative to assistive technology.
- **Probes wired into the meter** — the red lead is fixed to `VΩmA`, the black to
  `COM`, and the cables are drawn from those jacks to the probe handles. A probe
  can only travel as far as its lead allows; the cable goes taut at the limit.
- **Two ways to probe** — drag a probe onto a post, or click a component to clip
  both probes to its two posts. Click a probe (or press ← → while it is focused)
  to step through the test points; the cable follows.
- **Controls** — power, hold (freezes the displayed value), continuity buzzer
  (real Web Audio tone, muted by default), and the ohms zero trimmer.
- **Nine components** — 4.7 kΩ resistor, 1N4148 diode, red LED, 470 µF capacitor,
  AA cell, 230 V mains outlet, 2N3904 transistor, open terminals and a solder
  bridge. Each has plausible source resistance, forward drop, leakage and gain.

The circuit is derived from where the probes land:

- the two posts of one component → a measurement across it,
- red on the − post and black on the + post → the same measurement with the sign
  flipped (DC) or the diode's reverse leakage,
- both probes on the same post → a short,
- different components, or either probe off a post → an open circuit.

## Simulation notes

- **DC volts / current** read the component’s EMF through its source resistance;
  current ranges model meter burden (0.5 V full-scale drop), so an AA cell reads
  about 4 A on the 10 A range and overloads the 500 mA range.
- **AC volts** reads the mains only on AC ranges; on DC it reads zero.
- **Ohms** subtracts the zero-trim setting and displays `O.L` for an open circuit.
  ×1 / ×100 / ×10k centre at 20 Ω / 2 kΩ / 200 kΩ, and below 30 Ω the continuity
  buzzer can sound.
- **Diode test** shows the forward drop one way and `O.L` the other.
- **Capacitance** charges on a 700 ms time constant, so the reading climbs.
- **hFE** reads the transistor’s gain and `O.L` elsewhere.
- **Overload** is a manual-range affair: if the reading exceeds the selected
  range the LCD shows `O.L`; step up and it comes back.
- **Safety fiction**: the mains subject is clearly marked live. Resistance is
  refused across a live source, as on a real ohmmeter.

## Layout

A wooden bench spans the page. The components sit directly on the wood on the
left and the instrument stands on the right; on narrow screens the meter moves
above the components so the leads do not cross its face. A single SVG layer
draws the leads from the jacks to the probe handles, and the probes themselves
are real buttons layered above it.

```
components/avometer/
  avometer.tsx        state, measurement wiring, agent registration
  bench-items.tsx      the nine components, posts and bench notes
  probe-layer.tsx      cable geometry, probe dragging, contact lookup
  digital-readout.tsx  LCD display
  rotary-selector.tsx  19-detent range dial
  part-glyph.tsx       SVG drawings for each component
lib/
  measurement.ts       ranges, subjects, measurement simulation
  agent.ts             ui-sdk agent bridge
```

## Agent-ready

`lib/agent.ts` creates a ui-sdk agent on demand and registers the page’s tools.
An agent can snapshot the display parameters, press any `Measure …` component
button to clip both probes, set the range, zero trimmer and switches, and read
the accessible value from the readout group. The component test exercises that
path with `agent.snapshot()`, `agent.query()` and `agent.act()`.

## Stack

- Next.js 16 (App Router, Turbopack, Cache Components)
- React 19
- Tailwind CSS 4
- ui-sdk 0.1.0 beta (`@ui-sdk/react`, `@ui-sdk/core`)
- Vitest + Testing Library (jsdom)
