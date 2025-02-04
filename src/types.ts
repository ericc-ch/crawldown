export interface CrawlOptions {
  url: string
  depth?: number
  browserPath?: string
}

export interface CrawlResult {
  url: string
  markdown: string
  title: string
}
