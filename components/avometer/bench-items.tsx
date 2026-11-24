"use client"

import { Button } from "@ui-sdk/react/button"
import { SUBJECTS } from "@/lib/measurement"
import { Glyph } from "./part-glyph"
import { contactKey, type Probes } from "./probe-layer"

const TILTS = [-1.4, 0.9, -0.5, 1.1, -0.9, 0.4, 1.3, -0.7, 0.6]

export function BenchItems({
  probes,
  hot,
  onClip,
}: {
  probes: Probes
  hot: string | null
  onClip: (itemId: string) => void
}) {
  const attached = new Set<string>()
  if (probes.red.contact) attached.add(contactKey(probes.red.contact))
  if (probes.black.contact) attached.add(contactKey(probes.black.contact))

  return (
    <section className="bench-area" aria-labelledby="bench-title">
      <div className="bench-area__head">
        <h2 id="bench-title">On the bench</h2>
        <span>9 components · drag a probe or tap one</span>
      </div>

      <div className="items">
        {SUBJECTS.map((item, index) => {
          const red = probes.red.contact?.itemId === item.id
          const black = probes.black.contact?.itemId === item.id
          const clipped = red && black ? "both" : red ? "red" : black ? "black" : "false"

          return (
            <Button
              key={item.id}
              className="item"
              data-clipped={clipped}
              aria-label={`Measure ${item.name}`}
              aria-describedby="bench-hint"
              onClick={() => onClip(item.id)}
              style={{ "--tilt": `${TILTS[index % TILTS.length]}deg` } as React.CSSProperties}
            >
              <span className="item__body">
                <span className="item__glyph">
                  <Glyph kind={item.kind} />
                </span>
                {(["plus", "minus"] as const).map((side) => {
                  const key = `${item.id}:${side}`
                  return (
                    <span
                      key={side}
                      className="item__post"
                      data-terminal={key}
                      data-side={side}
                      data-hot={hot === key ? "true" : "false"}
                      data-clipped={attached.has(key) ? "true" : "false"}
                      aria-hidden="true"
                    >
                      <span className="item__post-hole" />
                      <span className="item__post-mark">{side === "plus" ? "+" : "−"}</span>
                    </span>
                  )
                })}
              </span>

              <span className="item__tag">
                <strong>{item.name}</strong>
                <span>{item.spec}</span>
              </span>
            </Button>
          )
        })}
      </div>

      <p id="bench-hint" className="bench-area__hint">
        Each lead is wired to the meter, so a probe reaches only as far as its
        cable. Drag a probe onto a post, or tap a component to clip both probes.
      </p>

      <section className="notes" aria-labelledby="notes-title">
        <h2 id="notes-title" className="notes__title">
          Reading it
        </h2>
        <ol className="notes__list">
          <li>
            <strong>Watch the decimal.</strong> The range sets where the point
            sits. If the display shows <em>O.L</em>, step up a range.
          </li>
          <li>
            <strong>Let it settle.</strong> The display samples twice a second;
            wait for the last digit to stop flicking before writing it down.
          </li>
          <li>
            <strong>Zero first.</strong> Clip both probes to one post and trim Ω
            zero before trusting a low resistance reading.
          </li>
        </ol>
      </section>
    </section>
  )
}
