import { Browser, Page, chromium } from "playwright"

import { getConfig } from "./config"

let browser: Browser | null = null

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

export async function createPage(): Promise<Page> {
  const browser = await getBrowser()
  const context = await browser.newContext()
  const page = await context.newPage()

  return page
}

export async function cleanup(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}
