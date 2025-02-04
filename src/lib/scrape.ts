import { writeFileSync } from "node:fs"

import { createPage } from "./browser"

export async function scrapeHtml(url: string): Promise<string> {
  const page = await createPage()
  try {
    await page.goto(url)

    const html = await page.content()

    writeFileSync("scraped.html", html)

    return html
  } catch (error) {
    console.error(`Error scraping ${url}:`, error)
    throw error
  } finally {
    await page.close() // Just close the page, not the browser
  }
}
