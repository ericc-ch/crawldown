import { Readability } from "@mozilla/readability"
import consola from "consola"
import defu from "defu"
import { JSDOM } from "jsdom"
import TurndownService from "turndown"
import { withoutTrailingSlash } from "ufo"

import { setConfig } from "./lib/config"
import { getLinks } from "./lib/get-links"
import { scrapeHtml } from "./lib/scrape"
import { CrawlOptions, CrawlResult } from "./types"

interface QueueItem {
  url: string
  depth: number
}

export const defaultOptions = {
  depth: 0,
} satisfies Partial<CrawlOptions>

export async function crawl(
  options: CrawlOptions,
): Promise<Array<CrawlResult>> {
  const processedOptions = defu(
    options,
    defaultOptions,
  ) as Required<CrawlOptions>

  processedOptions.url = withoutTrailingSlash(processedOptions.url)

  if (processedOptions.browserPath) {
    setConfig({ browserPath: processedOptions.browserPath })
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  })

  consola.start(`Starting job for: ${processedOptions.url}`)
  consola.debug(`Options: `)
  consola.debug(processedOptions)

  const results: Array<CrawlResult> = []
  const queue: Array<QueueItem> = [
    { url: processedOptions.url, depth: processedOptions.depth },
  ]
  const processedUrls = new Set<string>()

  while (queue.length > 0) {
    // We already checked if the queue is not empty
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const current = queue.shift()!

    // Skip if already parsed
    if (processedUrls.has(current.url)) {
      consola.debug(`Skipping already parsed URL: ${current.url}`)
      continue
    }

    consola.info(`Crawling ${current.url}, current depth: ${current.depth}`)

    consola.debug(`Scraping HTML from ${current.url}`)
    const html = await scrapeHtml(current.url)
    consola.debug(`Scraped HTML from ${current.url}`)

    consola.debug(`Parsing article content for ${current.url}`)
    const dom = new JSDOM(html)
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    // Skip if readability can't find any content
    if (!article?.content) {
      consola.warn(`No article content found for ${current.url}`)
      continue
    }

    consola.debug(`Parsed article content for ${current.url}`)

    consola.debug(`Converting to markdown for ${current.url}`)
    const markdown = turndownService.turndown(article.content)
    consola.debug(`Converted to markdown for ${current.url}`)

    results.push({
      url: current.url,
      markdown,
      title: article.title,
    })

    processedUrls.add(current.url)
    consola.debug(`Marked ${current.url} as processed`)

    if (current.depth === 0) {
      continue
    }

    // If we still have depth to go, add links to queue
    consola.debug(`Extracting links from ${current.url}`)

    const links = getLinks(html, current.url)

    consola.debug(`Found ${links.length} links`)
    consola.debug(`Links: \n${links.join("\n")}`)

    for (const link of links) {
      if (processedUrls.has(link)) {
        consola.debug(`Skipping already processed link: ${link}`)
        continue
      }

      queue.push({
        url: withoutTrailingSlash(link),
        depth: current.depth - 1,
      })
      consola.debug(`Queued ${link} for crawling`)
    }
  }

  consola.success(`Completed processing all queued URLs`)
  return results
}
