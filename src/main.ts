import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"
import * as fs from "node:fs"
import TurndownService from "turndown"

export function parseHtml(html: string) {
  const dom = new JSDOM(html)
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (article?.content) {
    const turndownService = new TurndownService()
    const markdown = turndownService.turndown(article.content)

    fs.writeFileSync("article.md", markdown)
    console.log("Article markdown content has been written to article.md")
  }

  return article
}
