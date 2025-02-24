#!/usr/bin/env node

import { defineCommand, runMain } from "citty"
import consola from "consola"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

import { BrowserManager } from "./lib/browser"
import { crawl, DEFAULT_OPTIONS } from "./main"

const main = defineCommand({
  meta: {
    name: "crawldown",
    description:
      "Crawl websites and convert their content into clean, readable Markdown using Mozilla's Readability and Turndown",
  },
  args: {
    url: {
      type: "positional",
      description: "URL to scrape",
      valueHint: "https://example.com",
      required: true,
    },
    depth: {
      alias: "d",
      type: "string",
      default: DEFAULT_OPTIONS.depth.toString(),
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
    "single-file": {
      type: "boolean",
      default: false,
      description: "Output all results to a single markdown file",
      required: false,
    },
    concurrency: {
      alias: "c",
      type: "string",
      default: DEFAULT_OPTIONS.concurrency.toString(),
      description: "Number of concurrent pages to use",
      required: false,
    },
    "scope-url": {
      type: "string",
      description:
        "URL that defines the crawling scope. Links outside this scope will be ignored",
      required: false,
    },
    headless: {
      type: "boolean",
      default: !DEFAULT_OPTIONS.noHeadless,
      description:
        "Disable headless mode - will show browser UI. Useful for debugging.",
      required: false,
    },
    force: {
      alias: "f",
      type: "boolean",
      default: DEFAULT_OPTIONS.force,
      description:
        "Force scraping content even if page hasn't fully loaded, 1 second before timeout",
      required: false,
    },
    timeout: {
      alias: "t",
      type: "string",
      default: DEFAULT_OPTIONS.timeout.toString(),
      description: "Navigation timeout in milliseconds",
      required: false,
    },
  },
  run: async ({ args }) => {
    const {
      url,
      depth: depthString,
      verbose,
      "browser-path": browserPath,
      output,
      "single-file": singleFile,
      concurrency: concurrencyString,
      "scope-url": scopeUrl,
      headless,
      force,
      timeout: timeoutString,
    } = args

    const depth = parseInt(depthString, 10)
    const concurrency = parseInt(concurrencyString, 10)
    const timeout = parseInt(timeoutString, 10)

    if (verbose) {
      consola.level = 4
    }

    const results = await crawl({
      url,
      depth,
      browserPath,
      concurrency,
      scopeUrl,
      noHeadless: !headless,
      force,
      timeout,
    })

    if (singleFile) {
      // If output ends with .md, use it directly, otherwise append .md
      const outputFile = output.endsWith(".md") ? output : `${output}.md`
      await writeToSingleFile(outputFile, results)
      return
    }

    // Create the base output directory
    await mkdir(output, { recursive: true })

    // Process each result and write to files
    for (const result of results) {
      try {
        const urlObj = new URL(result.url)
        const sanitizedPath = urlObj.pathname
          .replace(/\/$/, "") // Remove trailing slash
          .replace(/^\//, "") // Remove leading slash
          .replace(/[^a-z0-9/]/gi, "_") // Replace special chars with underscore

        let dirPath: string
        let fileName: string

        if (!sanitizedPath) {
          dirPath = join(output, urlObj.hostname)
          fileName = "index.md"
        } else {
          const pathParts = sanitizedPath.split("/")
          fileName = `${pathParts.pop()}.md`
          dirPath = join(output, urlObj.hostname, pathParts.join("/"))
        }

        await mkdir(dirPath, { recursive: true })
        await writeMarkdownFile(join(dirPath, fileName), result)
      } catch (error) {
        consola.error(`Failed to write file for ${result.url}:`, error)
      }
    }
  },
})

async function writeMarkdownFile(
  filePath: string,
  result: { title: string; url: string; markdown: string },
): Promise<void> {
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
}

async function writeToSingleFile(
  outputPath: string,
  results: Array<{ title: string; url: string; markdown: string }>,
): Promise<void> {
  const content = results
    .map(
      (result) => `# ${result.title}

Source: ${result.url}

${result.markdown}

---

`,
    )
    .join("\n")

  await writeFile(outputPath, content)
  consola.success(`Written all content to: ${outputPath}`)
}

void runMain(main).finally(async () => {
  const browserManager = BrowserManager.getInstance()
  await browserManager.cleanup()
  process.exit(0)
})
