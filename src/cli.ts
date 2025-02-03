import { defineCommand, runMain } from "citty"
import consola from "consola"

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
    verbose: {
      alias: "v",
      type: "boolean",
      default: false,
      description: "Verbose logging",
      required: false,
    },
  },
  run: async ({ args }) => {
    const { url, "crawl-depth": crawlDepthString, verbose } = args
    const crawlDepth = parseInt(crawlDepthString, 10)

    // Set consola level to 4 (debug) if verbose is true
    if (verbose) {
      consola.level = 4
    }

    const results = await parseHtml({ url, crawlDepth })
    console.log(JSON.stringify(results, null, 2))
  },
  cleanup: async () => {
    await cleanup()
  },
})

void runMain(main)
