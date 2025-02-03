import { describe, it, expect } from "vitest"

import { getLinks } from "../../src/lib/get-links"
import { readFixture } from "../utils"

describe("getLinks", () => {
  it("extracts links from HTML", () => {
    const html = readFixture("Getting Started _ Guide _ Vitest.html")
    const result = getLinks(html)

    expect(result.length).toBeGreaterThan(0)
  })

  it("handles empty HTML", () => {
    expect(getLinks("")).toEqual([])
  })

  it("handles HTML with no links", () => {
    const html = `
      <html>
        <body>
          <p>No links here</p>
        </body>
      </html>
    `
    expect(getLinks(html)).toEqual([])
  })

  it("trims whitespace from href values", () => {
    const html = `
      <a href=" https://example.com/page  ">Link</a>
    `
    expect(getLinks(html, "https://example.com")).toEqual([
      "https://example.com/page",
    ])
  })

  it("ignores links from different origins", () => {
    const html = `
      <a href="https://example.com/page">Same origin</a>
      <a href="https://different.com/page">Different origin</a>
    `
    expect(getLinks(html, "https://example.com")).toEqual([
      "https://example.com/page",
    ])
  })
})
