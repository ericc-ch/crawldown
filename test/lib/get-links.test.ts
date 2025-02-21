import { describe, it, expect } from "vitest"

import { getLinks } from "../../src/lib/get-links"

describe("getLinks", () => {
  const baseUrl = "https://example.com/docs"

  it("extracts basic links", () => {
    const html = `
      <a href="/docs/other">Other</a>
      <a href="https://example.com/docs/another">Another</a>
    `
    expect(getLinks(html, baseUrl)).toEqual([
      "https://example.com/docs/other",
      "https://example.com/docs/another",
    ])
  })

  it("ignores links that should be excluded", () => {
    const html = `
      <a href="javascript:void(0)">JS Link</a>
      <a href="mailto:test@example.com">Email</a>
      <a href="tel:123456789">Phone</a>
      <a href="#section">Anchor</a>
      <a href="">Empty</a>
      <a href="  ">Whitespace</a>
    `
    expect(getLinks(html, baseUrl)).toEqual([])
  })

  it("handles relative paths correctly", () => {
    const html = `
      <a href="../parent">Parent</a>
      <a href="./child">Child</a>
      <a href="sibling">Sibling</a>
    `
    expect(getLinks(html, baseUrl)).toEqual([
      "https://example.com/docs/child",
      "https://example.com/docs/sibling",
    ])
  })

  it("filters out external domains", () => {
    const html = `
      <a href="https://external.com/page">External</a>
      <a href="https://example.com/docs/internal">Internal</a>
    `
    expect(getLinks(html, baseUrl)).toEqual([
      "https://example.com/docs/internal",
    ])
  })

  it("normalizes URLs", () => {
    const html = `
      <a href="http://example.com/docs/page">HTTP</a>
      <a href="https://example.com/docs/page">HTTPS</a>
    `

    expect(getLinks(html, baseUrl)).toEqual(["https://example.com/docs/page"])
  })

  it("deduplicates identical links", () => {
    const html = `
      <a href="/docs/page">First</a>
      <a href="/docs/page">Second</a>
      <a href="https://example.com/docs/page">Third</a>
    `
    expect(getLinks(html, baseUrl)).toEqual(["https://example.com/docs/page"])
  })

  it("handles malformed HTML", () => {
    const html = `
      <a href="/docs/page>Unclosed quote</a>
      <a href=/docs/page>No quotes</a>
      <a href>No value</a>
    `
    // JSDOM should handle these cases
    expect(getLinks(html, baseUrl)).toEqual([])
  })

  it("throws error for invalid base URL", () => {
    expect(() => getLinks("<a href='/page'>Link</a>", "invalid-url")).toThrow(
      "Invalid base URL",
    )
  })
})
