import { JSDOM } from "jsdom"

export function getLinks(html: string, baseUrl: string): Array<string> {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const base = new URL(baseUrl)
  const basePath = base.pathname.replace(/\/$/, "") // Remove trailing slash

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
      const url = new URL(href, baseUrl)
      return url
    })
    .filter((url) => {
      // Check if the URL matches both origin and starts with the base path
      return (
        url.origin === base.origin &&
        (url.pathname.startsWith(basePath + "/") || url.pathname === basePath)
      )
    })
    .map((url) => url.origin + url.pathname)

  return [...new Set(links)] // Remove duplicates
}
