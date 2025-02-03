import { Readability } from "@mozilla/readability"
import consola from "consola"
import { JSDOM } from "jsdom"
import TurndownService from "turndown"

import { getLinks } from "./lib/get-links"
import { scrapeHtml } from "./lib/scrape"

interface ParseOptions {
  url: string
  depth?: number
  _parsedUrls?: Set<string> // Internal tracking of parsed URLs
}

interface ParseResult {
  url: string
  markdown: string
  title: string
}

export async function crawl(
  options: ParseOptions,
): Promise<Array<ParseResult>> {
  consola.start(`Processing ${options.url}`)

  // Initialize parsedUrls Set at the top level of recursion
  if (!options._parsedUrls) {
    options._parsedUrls = new Set<string>()
    consola.debug("Initializing new parsed URLs set")
  }

  // Skip if we've already parsed this URL
  if (options._parsedUrls.has(options.url)) {
    consola.debug(`Skipping already parsed URL: ${options.url}`)
    return []
  }

  // Mark this URL as parsed
  options._parsedUrls.add(options.url)
  consola.debug(`Added ${options.url} to parsed URLs set`)

  const results: Array<ParseResult> = []

  // Fetch the HTML content
  consola.info(`Scraping HTML from ${options.url}`)
  const html = await scrapeHtml(options.url)

  const dom = new JSDOM(html)
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (article?.content) {
    consola.debug(`Successfully parsed article content for ${options.url}`)
    const turndownService = new TurndownService()
    const markdown = turndownService.turndown(article.content)
    results.push({
      url: options.url,
      markdown,
      title: article.title,
    })

    if (options.depth && options.depth > 0) {
      // Extract origin from the current URL
      const urlObject = new URL(options.url)
      const origin = urlObject.origin

      consola.info(
        `Extracting links from ${options.url} (depth: ${options.depth})`,
      )
      const links = getLinks(html, origin)
      consola.debug(`Found ${links.length} links to process`)

      for (const link of links) {
        // Skip already parsed URLs
        if (options._parsedUrls.has(link)) {
          consola.debug(`Skipping already processed link: ${link}`)
          continue
        }

        consola.info(`Processing sub-link: ${link}`)
        const subResults = await crawl({
          url: link,
          depth: options.depth - 1,
          _parsedUrls: options._parsedUrls,
        })
        results.push(...subResults)
      }
    }
  } else {
    consola.debug(`No article content found for ${options.url}`)
  }

  consola.success(`Completed processing ${options.url}`)
  return results
}
