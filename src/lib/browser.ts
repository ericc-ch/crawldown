import { Browser, BrowserContext, Page, chromium } from "playwright"

import { getConfig } from "./config"

export class BrowserManager {
  private static instance: BrowserManager | null = null
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  // Make constructor private since this is a singleton
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  // Static method to get instance
  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  async getBrowserContext(): Promise<BrowserContext> {
    if (this.context) {
      return this.context
    }

    if (!this.browser) {
      const config = getConfig()
      this.browser = await chromium.launch({
        executablePath: config.browserPath ?? undefined,
      })
    }

    this.context = await this.browser.newContext()
    return this.context
  }

  async createPage(): Promise<Page> {
    const context = await this.getBrowserContext()
    return await context.newPage()
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}
