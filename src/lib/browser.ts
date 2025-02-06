import { Browser, BrowserContext, Page, chromium } from "playwright"

import { getConfig } from "./config"

let browser: Browser | null = null
let context: BrowserContext | null = null

async function getBrowser(): Promise<Browser> {
  if (browser) {
    return browser
  }

  const config = getConfig()

  browser = await chromium.launch({
    executablePath: config.browserPath ?? undefined,
  })

  return browser
}

async function getBrowserContext(): Promise<BrowserContext> {
  if (context) {
    return context
  }

  const browser = await getBrowser()
  context = await browser.newContext()
  return context
}

export async function createPage(): Promise<Page> {
  const context = await getBrowserContext()
  return await context.newPage()
}

export async function cleanup(): Promise<void> {
  if (context) {
    await context.close()
    context = null
  }

  if (browser) {
    await browser.close()
    browser = null
  }
}
