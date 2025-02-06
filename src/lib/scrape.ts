import type { Page } from "playwright"

export async function scrapeHtml(page: Page, url: string): Promise<string> {
  try {
    await page.goto(url, {
      timeout: 60_000,
    })

    return await page.content()
  } catch (error) {
    console.error(`Error scraping ${url}:`, error)
    throw error
  }
}
