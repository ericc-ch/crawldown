import { Readability } from "@mozilla/readability"
import consola from "consola"
import defu from "defu"
import { JSDOM } from "jsdom"
import TurndownService from "turndown"

import { getLinks } from "./lib/get-links"
import { scrapeHtml } from "./lib/scrape"

interface QueueItem {
  url: string
  depth: number
}

interface CrawlOptions {
  url: string
  depth?: number
}

interface CrawlResult {
  url: string
  markdown: string
  title: string
}

const defaultOptions: Partial<CrawlOptions> = {
  depth: 0,
}

export async function crawl(
  options: CrawlOptions,
): Promise<Array<CrawlResult>> {
  const { url, depth } = defu(options, defaultOptions) as Required<CrawlOptions>
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  })

  consola.start(`Crawling ${url}`)
  consola.debug(`Options: ${JSON.stringify(options, null, 2)}`)

  const results: Array<CrawlResult> = []
  const queue: Array<QueueItem> = [{ url: url, depth }]
  const parsedUrls = new Set<string>()

  while (queue.length > 0) {
    // We already checked if the queue is not empty
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const current = queue.shift()!

    // Skip if already parsed
    if (parsedUrls.has(current.url)) {
      consola.debug(`Skipping already parsed URL: ${current.url}`)
      continue
    }

    consola.info(`Scraping: ${current.url}, current depth: ${current.depth}`)

    // Mark this URL as parsed
    parsedUrls.add(current.url)
    consola.debug(`Added ${current.url} to parsed URLs set`)

    // Fetch the HTML content
    consola.info(`Scraping HTML from ${current.url}`)
    const html = await scrapeHtml(current.url)

    const dom = new JSDOM(html)
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    // Skip if readability can't find any content
    if (!article?.content) {
      consola.debug(`No article content found for ${current.url}`)
      continue
    }

    consola.debug(`Successfully parsed article content for ${current.url}`)

    const markdown = turndownService.turndown(article.content)

    results.push({
      url: current.url,
      markdown,
      title: article.title,
    })

    if (current.depth === 0) {
      continue
    }

    // If we still have depth to go, add links to queue

    consola.info(
      `Extracting links from ${current.url}, current depth: ${current.depth}`,
    )

    const links = getLinks(html, current.url)

    consola.debug(`Found ${links.length} links to process`)
    consola.debug(`Links: \n${links.join("\n")}`)

    for (const link of links) {
      if (parsedUrls.has(link)) {
        consola.debug(`Skipping already processed link: ${link}`)
        continue
      }

      consola.debug(`Adding ${link} queue with depth: ${current.depth - 1}`)
      queue.push({
        url: link,
        depth: current.depth - 1,
      })
    }
  }

  consola.success(`Completed processing all queued URLs`)
  return results
}
