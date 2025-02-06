export interface CrawlOptions {
  url: string
  depth?: number
  browserPath?: string
  concurrency?: number
}

export interface CrawlResult {
  url: string
  markdown: string
  title: string
}
