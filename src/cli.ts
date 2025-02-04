import { defineCommand, runMain } from "citty"
import consola from "consola"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

import { cleanup } from "./lib/browser"
import { crawl, defaultOptions } from "./main"

const main = defineCommand({
  meta: {
    name: "web2md",
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
      default: defaultOptions.depth.toString(),
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
  },
  run: async ({ args }) => {
    const {
      url,
      depth: depthString,
      verbose,
      "browser-path": browserPath,
      output,
      "single-file": singleFile,
    } = args
    const depth = parseInt(depthString, 10)

    if (verbose) {
      consola.level = 4
    }

    const results = await crawl({ url, depth, browserPath })

    // Create the base output directory
    await mkdir(output, { recursive: true })

    if (singleFile) {
      const outputFile = join(output, "contents.md")
      await writeToSingleFile(outputFile, results)

      return
    }

    // Process each result and write to files
    for (const result of results) {
      try {
        const urlObj = new URL(result.url)
        const sanitizedPath = urlObj.pathname
          .replace(/\/$/, "") // Remove trailing slash
          .replace(/^\//, "") // Remove leading slash
          .replace(/[^a-zA-Z0-9/]/g, "_") // Replace special chars with underscore

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
  cleanup: async () => {
    await cleanup()
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

void runMain(main)
