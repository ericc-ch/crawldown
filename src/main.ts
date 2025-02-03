import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"
import TurndownService from "turndown"

import { getLinks } from "./lib/get-links"
import { scrapeHtml } from "./lib/scrape"

interface ParseOptions {
  url: string
  crawlDepth?: number
  _parsedUrls?: Set<string> // Internal tracking of parsed URLs
}

interface ParseResult {
  url: string
  markdown: string
  title: string
}

export async function parseHtml(
  html: string,
  options: ParseOptions,
): Promise<Array<ParseResult>> {
  // Initialize parsedUrls Set at the top level of recursion
  if (!options._parsedUrls) {
    options._parsedUrls = new Set<string>()
  }

  // Skip if we've already parsed this URL
  if (options._parsedUrls.has(options.url)) {
    return []
  }

  // Mark this URL as parsed
  options._parsedUrls.add(options.url)

  const results: Array<ParseResult> = []

  const dom = new JSDOM(html)
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (article?.content) {
    const turndownService = new TurndownService()
    const markdown = turndownService.turndown(article.content)
    results.push({
      url: options.url,
      markdown,
      title: article.title,
    })

    if (options.crawlDepth && options.crawlDepth > 0) {
      // Extract origin from the current URL
      const urlObject = new URL(options.url)
      const origin = urlObject.origin

      const links = getLinks(html, origin)

      for (const link of links) {
        // Skip already parsed URLs
        if (options._parsedUrls.has(link)) {
          continue
        }

        const linkedHtml = await scrapeHtml(link)
        const subResults = await parseHtml(linkedHtml, {
          url: link,
          crawlDepth: options.crawlDepth - 1,
          _parsedUrls: options._parsedUrls,
        })
        results.push(...subResults)
      }
    }
  }

  return results
}
