import { defineCommand, runMain } from "citty"

import { cleanup } from "./lib/browser"
import { parseHtml } from "./main"

const main = defineCommand({
  args: {
    url: {
      type: "positional",
      description: "URL to scrape",
      valueHint: "https://example.com",
      required: true,
    },
    "crawl-depth": {
      alias: "d",
      type: "string",
      default: "1",
      description: "Number of levels to crawl",
      required: false,
    },
  },
  run: async ({ args }) => {
    const { url, "crawl-depth": crawlDepthString } = args
    const crawlDepth = parseInt(crawlDepthString, 10)

    const results = await parseHtml({ url, crawlDepth })
    console.log(JSON.stringify(results, null, 2))
  },
  cleanup: async () => {
    await cleanup()
  },
})

void runMain(main)
