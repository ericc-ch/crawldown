import { JSDOM } from "jsdom"

export function getLinks(html: string, origin = "http://base"): Array<string> {
  const dom = new JSDOM(html)
  const document = dom.window.document

  // Get all <a> elements with href attributes
  const linkElements = document.querySelectorAll("a[href]")

  const links = Array.from(linkElements)
    .map((element) => element.getAttribute("href"))
    .filter((href): href is string => href !== null)
    .map((href) => href.trim())
    .filter(
      (href) =>
        href !== "" &&
        !href.startsWith("javascript:") &&
        !href.startsWith("mailto:") &&
        !href.startsWith("tel:") &&
        !href.startsWith("#"),
    )
    .map((href) => {
      const url = new URL(href, origin)
      return url
    })
    .filter((url) => url.origin === new URL(origin).origin)
    .map((url) => url.origin + url.pathname)

  return [...new Set(links)] // Remove duplicates
}
