import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseHtml } from "../src/main"

const readFixture = (name: string) => {
  return readFileSync(join(__dirname, "fixtures", name), "utf-8")
}

describe("parseHtml", () => {
  it("should parse basic HTML content", () => {
    const html = readFixture("basic.html")
    const result = parseHtml(html)

    expect(result).toBeTruthy()
    expect(result?.title).toBe("Test Title")
    expect(result?.textContent).toContain("Test paragraph content")
    expect(result?.content).toContain("<p>Test paragraph content.")
  })

  it("should handle empty HTML", () => {
    const html = "<html><body></body></html>"
    const result = parseHtml(html)

    expect(result).toBeTruthy()
    expect(result?.textContent).toBe("")
  })
})
