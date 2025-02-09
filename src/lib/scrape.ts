import type { Page } from "playwright"

export const DEFAULT_TIMEOUT = 10_000
export const DEFAULT_FORCE = false

interface ScrapeHtmlParams {
  page: Page
  url: string
  force?: boolean
  timeout?: number
}

async function scrapeWithForce(
  page: Page,
  url: string,
  timeout: number,
): Promise<string> {
  const safetyMarginMs = 1000 // Get content 1 second before timeout
  let content: string | null = null

  const timeoutPromise = new Promise<string>((resolve, reject) => {
    setTimeout(async () => {
      try {
        content = await page.content()
        resolve(content)
      } catch (err) {
        reject(err as Error)
      }
    }, timeout - safetyMarginMs)
  })

  const navigationPromise = page
    .goto(url, {
      timeout,
      waitUntil: "load",
    })
    .then(() => page.content())

  return await Promise.race([navigationPromise, timeoutPromise])
}

async function scrapeNormal(
  page: Page,
  url: string,
  timeout: number,
): Promise<string> {
  await page.goto(url, {
    timeout,
    waitUntil: "load",
  })
  return await page.content()
}

export async function scrapeHtml({
  page,
  url,
  force = DEFAULT_FORCE,
  timeout = DEFAULT_TIMEOUT,
}: ScrapeHtmlParams): Promise<string> {
  try {
    return force ?
        await scrapeWithForce(page, url, timeout)
      : await scrapeNormal(page, url, timeout)
  } catch (error) {
    // If we have content from force mode, return it even if navigation failed
    if (force && (await page.content())) {
      return await page.content()
    }

    console.error(`Error scraping ${url}:`, error)
    throw error
  }
}
