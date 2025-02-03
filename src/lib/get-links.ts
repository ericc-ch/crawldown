import { JSDOM } from "jsdom"

export function getLinks(html: string): Array<string> {
  const dom = new JSDOM(html)
  const document = dom.window.document

  // Get all <a> elements with href attributes
  const linkElements = document.querySelectorAll("a[href]")

  // Convert NodeList to array and extract href attributes
  const links = Array.from(linkElements)
    .map((element) => element.getAttribute("href"))
    .filter((href): href is string => href !== null) // Type guard to filter out null values
    .map((href) => href.trim())
    .filter(
      (href) =>
        // Filter out empty strings, javascript: links, mailto: links, tel: links, and # anchors
        href !== "" &&
        !href.startsWith("javascript:") &&
        !href.startsWith("mailto:") &&
        !href.startsWith("tel:") &&
        !href.startsWith("#"),
    )
    .map((href) => {
      // Remove hash fragments and URL parameters
      const url = new URL(href, "http://base") // Using dummy base URL for relative paths
      return url.origin + url.pathname
    })

  return [...new Set(links)] // Remove duplicates
}
