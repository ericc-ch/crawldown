import { JSDOM } from "jsdom"
import {
  hasProtocol,
  isRelative,
  isSamePath,
  joinRelativeURL,
  parseURL,
  withBase,
  withHttps,
} from "ufo"

export function getLinks(html: string, scopeUrl: string): Array<string> {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const base = parseURL(scopeUrl)

  if (!base.host) throw new Error("Invalid base URL")

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
    .map((url) =>
      isRelative(url) || !hasProtocol(url) ?
        joinRelativeURL(base.pathname, url)
      : url,
    )
    // We already threw an error if base.host is undefined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .map((url) => withHttps(withBase(url, base.host!)))
    .map((url) => parseURL(url))
    .filter((url) => url.host === base.host)
    .filter(
      (url) =>
        url.pathname.startsWith(base.pathname) ||
        isSamePath(url.pathname, base.pathname),
    )
    .map((url) => withHttps(`${url.host}${url.pathname}`))

  return [...new Set(links)] // Remove duplicates
}
