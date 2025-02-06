import { Browser, BrowserContext, Page, chromium } from "playwright"

import { ConfigManager } from "./config"

export class PagePool {
  private pageIndex = 0
  private pageInUse: Array<boolean>

  constructor(private pages: Array<Page>) {
    this.pageInUse = new Array<boolean>(pages.length).fill(false)
  }

  async getAvailablePage(): Promise<Page> {
    // Keep trying until we find an available page
    while (true) {
      for (let i = 0; i < this.pages.length; i++) {
        const currentIndex = (this.pageIndex + i) % this.pages.length
        if (!this.pageInUse[currentIndex]) {
          this.pageInUse[currentIndex] = true
          this.pageIndex = (currentIndex + 1) % this.pages.length
          return this.pages[currentIndex]
        }
      }
      // If no page is available, wait a bit and try again
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  releasePage(page: Page): void {
    const index = this.pages.indexOf(page)
    if (index !== -1) {
      this.pageInUse[index] = false
    }
  }
}

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
      const config = ConfigManager.getInstance().getConfig()
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
