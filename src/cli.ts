import { defineCommand, runMain } from "citty"
import consola from "consola"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

import { cleanup } from "./lib/browser"
import { setConfig } from "./lib/config"
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
    "browser-path": {
      type: "string",
      description:
        "Path to browser executable. Will use playwright default if not provided",
      required: false,
    },
    output: {
      alias: "o",
      type: "string",
      default: "output",
      description: "Output directory",
      required: false,
    },
  },
  run: async ({ args }) => {
    const {
      url,
      "crawl-depth": crawlDepthString,
      verbose,
      "browser-path": browserPath,
      output,
    } = args
    const crawlDepth = parseInt(crawlDepthString, 10)

    if (verbose) {
      consola.level = 4
    }

    if (browserPath) {
      setConfig({ browserPath })
    }

    const results = await parseHtml({ url, crawlDepth })

    // Create the base output directory
    await mkdir(output, { recursive: true })

    // Process each result and write to files
    for (const result of results) {
      try {
        // Create a sanitized directory name from the URL
        const urlObj = new URL(result.url)
        const sanitizedPath = urlObj.pathname
          .replace(/\/$/, "") // Remove trailing slash
          .replace(/^\//, "") // Remove leading slash
          .replace(/[^a-zA-Z0-9/]/g, "_") // Replace special chars with underscore

        // Calculate the file name from the path parts
        const pathParts = sanitizedPath.split("/")
        const fileName = (pathParts.pop() ?? "index") + ".md" // Use 'index' if path ends in slash
        const dirPath = join(output, urlObj.hostname, pathParts.join("/"))
        const filePath = join(dirPath, fileName)

        // Create directory
        await mkdir(dirPath, { recursive: true })

        // Create the content with frontmatter
        const content = [
          "---",
          `title: ${JSON.stringify(result.title)}`,
          `url: ${result.url}`,
          "---",
          "",
          result.markdown,
        ].join("\n")

        await writeFile(filePath, content)
        consola.success(`Written: ${filePath}`)
      } catch (error) {
        consola.error(`Failed to write file for ${result.url}:`, error)
      }
    }
  },
  cleanup: async () => {
    await cleanup()
  },
})

void runMain(main)
