import pLimit from "p-limit"
import TurndownService from "turndown"

import { PagePool } from "./lib/browser"

export interface CrawlContext {
  pagePool: PagePool
  turndownService: TurndownService
  processedUrls: Set<string>
  urlsByDepth: Map<number, Array<string>>
  limit: ReturnType<typeof pLimit>
  results: Array<CrawlResult>
}

export interface CrawlOptions {
  url: string
  depth?: number
  browserPath?: string
  concurrency?: number
  scopeUrl?: string
}

export interface CrawlResult {
  url: string
  markdown: string
  title: string
}

export interface ProcessSingleUrlParams {
  url: string
  currentDepth: number
  context: CrawlContext
  scopeUrl: string
}

export interface ProcessNextDepthLinksParams {
  html: string
  url: string
  currentDepth: number
  context: CrawlContext
  scopeUrl: string
}

export interface ProcessDepthLevelParams {
  currentDepth: number
  context: CrawlContext
  scopeUrl: string
}
