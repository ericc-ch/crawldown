import { createPage } from "./browser"

export async function scrapeHtml(url: string): Promise<string> {
  const page = await createPage()
  try {
    await page.goto(url, {
      timeout: 60_000,
    })

    const html = await page.content()

    return html
  } catch (error) {
    console.error(`Error scraping ${url}:`, error)
    throw error
  } finally {
    await page.close() // Just close the page, not the browser
  }
}
