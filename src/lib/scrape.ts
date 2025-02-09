import type { Page } from "playwright"

export const DEFAULT_TIMEOUT = 10_000
export const DEFAULT_FORCE = false

export async function scrapeHtml(
  page: Page,
  url: string,
  force = DEFAULT_FORCE,
  timeout = DEFAULT_TIMEOUT,
): Promise<string> {
  try {
    if (force) {
      const safetyMarginMs = 1000 // Get content 1 second before timeout
      let content: string | null = null

      // Set up the timeout handler that will capture content before timeout
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

      // Try normal navigation
      const navigationPromise = page
        .goto(url, {
          timeout,
          waitUntil: "load",
        })
        .then(() => page.content())

      // Race between normal navigation and forced content retrieval
      return await Promise.race([navigationPromise, timeoutPromise])
    } else {
      await page.goto(url, {
        timeout,
        waitUntil: "load",
      })
      return await page.content()
    }
  } catch (error) {
    // If we have content from force mode, return it even if navigation failed
    if (force && (await page.content())) {
      return await page.content()
    }

    console.error(`Error scraping ${url}:`, error)
    throw error
  }
}
