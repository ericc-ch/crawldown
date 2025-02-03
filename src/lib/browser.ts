import { Browser, Page, chromium } from "playwright"

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
    })
  }
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
