import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"

export function parseHtml(html: string) {
  const dom = new JSDOM(html)
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  console.log("Title:", article?.title)
  console.log("Content:", article?.textContent)
  console.log("HTML Content:", article?.content)

  return article
}
