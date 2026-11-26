import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { createAgent } from "@ui-sdk/react/agent"
import { Avometer } from "./avometer"

function readout() {
  return screen.getByRole("group", { name: /Digital reading/ })
}

test("starts on a charged cell and blanks when switched off", async () => {
  const user = userEvent.setup()
  render(<Avometer />)

  expect(readout().getAttribute("aria-label")).toContain("1.583 volts")
  expect(
    within(screen.getByRole("radiogroup", { name: "Function and range" })).queryByRole(
      "radio",
      { name: "Off" }
    )
  ).toBeNull()

  await user.click(screen.getByRole("button", { name: "Power" }))
  expect(readout().getAttribute("aria-label")).toContain("instrument off")
})

test("the selector arrow keys change the range", async () => {
  const user = userEvent.setup()
  render(<Avometer />)

  const dial = screen.getByRole("radiogroup", { name: "Function and range" })
  within(dial)
    .getByRole("radio", { name: "DC volts 2.5" })
    .focus()
  await user.keyboard("{ArrowLeft}")

  expect(
    within(dial)
      .getByRole("radio", { name: "DC volts 10" })
      .getAttribute("aria-checked")
  ).toBe("true")
})

test("choosing a resistor and the ohms range reads it", async () => {
  const user = userEvent.setup()
  render(<Avometer />)

  await user.click(screen.getByRole("button", { name: "Measure Carbon resistor" }))
  await user.click(screen.getByRole("radio", { name: "Ohms times 100" }))

  expect(readout().getAttribute("aria-label")).toContain("4.70 kilohms")
})

test("stepping the probes onto the cell the wrong way round flips the sign", async () => {
  const user = userEvent.setup()
  render(<Avometer />)

  const red = screen.getByRole("button", { name: /^Red probe/ })
  const black = screen.getByRole("button", { name: /^Black probe/ })

  red.focus()
  await user.keyboard("{ArrowRight}")
  black.focus()
  await user.keyboard("{ArrowLeft}")

  expect(red.getAttribute("data-contact")).toBe("cell:minus")
  expect(black.getAttribute("data-contact")).toBe("cell:plus")
  expect(readout().getAttribute("aria-label")).toContain("-1.583 volts")
})

test("the zero trimmer steps with the arrow keys", async () => {
  const user = userEvent.setup()
  render(<Avometer />)

  expect(screen.getByText(/0\.35 Ω/)).toBeTruthy()
  screen.getByRole("slider", { name: "Zero adjust" }).focus()
  await user.keyboard("{ArrowRight}")

  expect(screen.getByText(/0\.36 Ω/)).toBeTruthy()
})

test("the continuity buzzer is a button", async () => {
  const user = userEvent.setup()
  render(<Avometer />)

  const buzzer = screen.getByRole("button", { name: "Buzzer" })
  expect(buzzer.getAttribute("aria-pressed")).toBe("false")
  await user.click(buzzer)
  expect(buzzer.getAttribute("aria-pressed")).toBe("true")
})

test("an agent can find every control and change it", async () => {
  const agent = createAgent()
  render(<Avometer />)

  const components = agent
    .snapshot()
    .filter((entry) => !entry.offPage && entry.component !== "more")
  const labels = components.map((entry) => entry.label)

  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  for (const label of [
    "Power",
    "Hold",
    "Buzzer",
    "Function and range",
    "Measure Carbon resistor",
    "Measure AA cell",
    "Zero adjust",
  ]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }
  expect(
    labels.some((label) => label?.startsWith("Red probe, AA cell")),
    "the red probe is missing from the snapshot"
  ).toBe(true)
  expect(
    labels.some((label) => label?.startsWith("Black probe, AA cell")),
    "the black probe is missing from the snapshot"
  ).toBe(true)

  const dialList = await agent.query({ within: "Function and range" })
  if ("error" in dialList) throw new Error(dialList.error)
  const range = dialList[0].items?.find(
    (item) => item.label === "DC volts 10"
  )
  expect(range).toBeTruthy()

  const result = await agent.act({
    steps: [
      { ref: "Function and range", action: "setValue", args: [range!.value] },
      { ref: "Measure AA cell", action: "press" },
      { ref: "Zero adjust", action: "setValue", args: [1.2] },
      { ref: "Buzzer", action: "setPressed", args: [true] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)

  expect(readout().getAttribute("aria-label")).toContain("1.58 volts")
  expect(screen.getByRole("button", { name: "Buzzer" }).getAttribute("aria-pressed")).toBe("true")
  expect(screen.getByText(/1\.20 Ω/)).toBeTruthy()
})
