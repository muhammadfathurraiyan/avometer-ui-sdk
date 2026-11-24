"use client"

import { createAgent, registerTools } from "@ui-sdk/react/agent"

let bridge: ReturnType<typeof createAgent> | undefined

export function getAgent() {
  bridge ??= createAgent()
  return bridge
}

export function registerMeterTools() {
  if (typeof document === "undefined" || !("modelContext" in document)) {
    return () => {}
  }
  return registerTools(getAgent(), { allow: () => true })
}
