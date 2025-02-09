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
import {
  CrawlOptions,
  CrawlResult,
  ProcessSingleUrlParams,
  ProcessNextDepthLinksParams,
  ProcessDepthLevelParams,
  CrawlContext,
} from "./types"

export const defaultOptions = {
  depth: 0,
  concurrency: 4,
  noHeadless: false,
} satisfies Partial<CrawlOptions>

async function processSingleUrl({
  url,
  currentDepth,
  context,
}: ProcessSingleUrlParams): Promise<CrawlResult | null> {
  if (context.processedUrls.has(url)) {
    consola.debug(`Skipping already parsed URL: ${url}`)
    return null
  }

  consola.info(`Crawling ${url}, current depth: ${currentDepth}`)

  try {
    const page = await context.pagePool.getAvailablePage()

    try {
      const html = await scrapeHtml(page, url)
      const dom = new JSDOM(html)
      const reader = new Readability(dom.window.document)
      const article = reader.parse()

      if (!article?.content) {
        consola.warn(`No article content found for ${url}`)
        return null
      }

      const markdown = context.turndownService.turndown(article.content)
      context.processedUrls.add(url)

      processNextDepthLinks({ html, url, currentDepth, context })

      return {
        url,
        markdown,
        title: article.title,
      }
    } finally {
      context.pagePool.releasePage(page)
    }
  } catch (error) {
    consola.error(`Error processing ${url}:`, error)
    return null
  }
}

function processNextDepthLinks({
  html,
  currentDepth,
  context,
}: ProcessNextDepthLinksParams): void {
  if (currentDepth > 0) {
    const links = getLinks(html, context.scopeUrl)
    const newLinks = links
      .filter((link) => !context.processedUrls.has(link))
      .map((link) => withoutTrailingSlash(link))

    const nextDepth = currentDepth - 1
    const existingUrls = context.urlsByDepth.get(nextDepth) ?? []
    context.urlsByDepth.set(nextDepth, [...existingUrls, ...newLinks])
  }
}

async function processDepthLevel({
  currentDepth,
  context,
}: ProcessDepthLevelParams): Promise<void> {
  const urlsToProcess = context.urlsByDepth.get(currentDepth) ?? []
  consola.info(
    `Processing ${urlsToProcess.length} URLs at depth ${currentDepth}`,
  )

  const currentDepthPromises = urlsToProcess.map((url) =>
    context.limit(async () => processSingleUrl({ url, currentDepth, context })),
  )

  const currentDepthResults = await Promise.all(currentDepthPromises)
  context.results.push(
    ...currentDepthResults.filter((r): r is CrawlResult => r !== null),
  )
}

export async function crawl(
  options: CrawlOptions,
): Promise<Array<CrawlResult>> {
  const browserManager = BrowserManager.getInstance()

  const processedOptions = defu(
    options,
    defaultOptions,
  ) as Required<CrawlOptions>

  processedOptions.url = withoutTrailingSlash(processedOptions.url)

  if (processedOptions.browserPath || processedOptions.noHeadless) {
    ConfigManager.getInstance().setConfig({
      browserPath: processedOptions.browserPath,
      headless: !processedOptions.noHeadless,
    })
  }

  try {
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

    const context: CrawlContext = {
      pagePool,
      turndownService,
      processedUrls: new Set<string>(),
      urlsByDepth: new Map<number, Array<string>>(),
      limit: pLimit(processedOptions.concurrency),
      results: [],
      scopeUrl: options.scopeUrl ?? processedOptions.url,
    }

    context.urlsByDepth.set(processedOptions.depth, [processedOptions.url])

    for (
      let currentDepth = processedOptions.depth;
      currentDepth >= 0;
      currentDepth--
    ) {
      await processDepthLevel({
        currentDepth,
        context,
      })
    }

    await Promise.all(pages.map((page) => page.close()))
    await browserManager.cleanup()

    consola.success(`Completed processing all URLs`)
    return context.results
  } catch (error) {
    await browserManager.cleanup()
    throw error
  }
}
