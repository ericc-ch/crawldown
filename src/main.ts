import { Readability } from "@mozilla/readability"
import consola from "consola"
import defu from "defu"
import { JSDOM } from "jsdom"
import pLimit from "p-limit"
import TurndownService from "turndown"
import { withoutTrailingSlash } from "ufo"

import { BrowserManager, PagePool } from "./lib/browser"
import { ConfigManager } from "./lib/config"
import { getLinks } from "./lib/get-links"
import { scrapeHtml } from "./lib/scrape"
import { CrawlOptions, CrawlResult } from "./types"

export const defaultOptions = {
  depth: 0,
  concurrency: 4,
} satisfies Partial<CrawlOptions>

export async function crawl(
  options: CrawlOptions,
): Promise<Array<CrawlResult>> {
  const browserManager = BrowserManager.getInstance()

  const processedOptions = defu(
    options,
    defaultOptions,
  ) as Required<CrawlOptions>

  processedOptions.url = withoutTrailingSlash(processedOptions.url)

  if (processedOptions.browserPath) {
    ConfigManager.getInstance().setConfig({
      browserPath: processedOptions.browserPath,
    })
  }

  try {
    // Create a pool of pages equal to the concurrency limit
    const pages = await Promise.all(
      Array(processedOptions.concurrency)
        .fill(null)
        .map(() => browserManager.createPage()),
    )
    const pagePool = new PagePool(pages)

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
    const processedUrls = new Set<string>()

    // Group URLs by depth in a Map
    const urlsByDepth = new Map<number, Array<string>>()
    urlsByDepth.set(processedOptions.depth, [processedOptions.url])

    // Create a concurrency limiter
    const limit = pLimit(processedOptions.concurrency)

    // Process each depth level
    for (
      let currentDepth = processedOptions.depth;
      currentDepth >= 0;
      currentDepth--
    ) {
      const urlsToProcess = urlsByDepth.get(currentDepth) ?? []
      consola.info(
        `Processing ${urlsToProcess.length} URLs at depth ${currentDepth}`,
      )

      const currentDepthPromises = urlsToProcess.map((url) =>
        limit(async () => {
          if (processedUrls.has(url)) {
            consola.debug(`Skipping already parsed URL: ${url}`)
            return null
          }

          consola.info(`Crawling ${url}, current depth: ${currentDepth}`)

          try {
            const page = await pagePool.getAvailablePage()

            try {
              const html = await scrapeHtml(page, url)
              const dom = new JSDOM(html)
              const reader = new Readability(dom.window.document)
              const article = reader.parse()

              if (!article?.content) {
                consola.warn(`No article content found for ${url}`)
                return null
              }

              const markdown = turndownService.turndown(article.content)
              processedUrls.add(url)

              // If we have more depth to go, collect next level URLs
              if (currentDepth > 0) {
                const links = getLinks(html, url)
                const newLinks = links
                  .filter((link) => !processedUrls.has(link))
                  .map((link) => withoutTrailingSlash(link))

                // Add links to next depth level
                const nextDepth = currentDepth - 1
                const existingUrls = urlsByDepth.get(nextDepth) ?? []
                urlsByDepth.set(nextDepth, [...existingUrls, ...newLinks])
              }

              return {
                url,
                markdown,
                title: article.title,
              }
            } finally {
              // Make sure to release the page
              pagePool.releasePage(page)
            }
          } catch (error) {
            consola.error(`Error processing ${url}:`, error)
            return null
          }
        }),
      )

      // Process all URLs at current depth in parallel with concurrency limit
      const currentDepthResults = await Promise.all(currentDepthPromises)

      // Add valid results to the final results array
      results.push(
        ...currentDepthResults.filter((r): r is CrawlResult => r !== null),
      )
    }

    // Cleanup pages at the end
    await Promise.all(pages.map((page) => page.close()))
    await browserManager.cleanup()

    consola.success(`Completed processing all URLs`)
    return results
  } catch (error) {
    // Make sure to cleanup on error
    await browserManager.cleanup()
    throw error
  }
}
