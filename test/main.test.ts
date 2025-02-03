import { describe, expect, it } from "vitest"

import { parseHtml } from "../src/main"
import { readFixture } from "./utils"

describe("parseHtml", () => {
  it("should parse basic HTML content", () => {
    const html = readFixture("Getting Started _ Guide _ Vitest.html")
    const result = parseHtml(html)

    expect(result).toBeTruthy()
  })

  it("should handle empty HTML", () => {
    const html = "<html><body></body></html>"
    const result = parseHtml(html)

    expect(result).toBeNull()
  })
})
