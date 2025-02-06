# crawldown

Crawl websites and convert their pages into clean, readable Markdown content using Mozilla's Readability and Turndown.

This package combines website crawling with Mozilla's Readability (the same technology behind Firefox's Reader View) and Turndown to:
1. Crawl websites and follow links up to a specified depth
2. Extract the main content from each page, removing clutter and ads
3. Convert the cleaned content into well-formatted Markdown
4. Preserve the site structure in the output files

## Features

- Intelligent website crawling with configurable depth
- Clean extraction of main content from web pages using Mozilla's Readability
- Conversion of readable HTML to Markdown using Turndown
- Removes ads, navigation, sidebars, and other distracting elements
- Preserves important content structure and formatting
- Maintains website hierarchy in output directory structure
- Flexible output options including single file or directory structure
- Smart URL handling and deduplication during crawling

## Installation

```bash
npm install crawldown
# or
pnpm add crawldown
# or
yarn add crawldown
```

## CLI Usage

The package provides a command-line interface for easy conversion:

```bash
# Basic usage
npx crawldown https://example.com

# Specify crawl depth (default: 0)
npx crawldown https://example.com -d 2

# Custom output directory (when not using --single-file)
npx crawldown https://example.com -o my-docs

# Output to a single file (will create result.md)
npx crawldown https://example.com --single-file -o result

# Output to a single file with explicit .md extension
npx crawldown https://example.com --single-file -o result.md

# Enable verbose logging
npx crawldown https://example.com -v

# Specify custom browser path
npx crawldown https://example.com --browser-path /path/to/chrome

# Set number of concurrent pages (default: 4)
npx crawldown https://example.com -c 8
```

### CLI Options

- `url`: URL to scrape (required, positional argument)
- `-d, --depth`: Number of levels to crawl (default: "0")
- `-v, --verbose`: Enable verbose logging (default: false)
- `--browser-path`: Path to browser executable. Will use playwright default if not provided
- `-o, --output`: When used with --single-file, specifies the output filename. Otherwise specifies the output directory (default: "output")
- `--single-file`: Output all results to a single markdown file instead of a directory structure (default: false)
- `-c, --concurrency`: Number of concurrent pages to use (default: "4")

## Programmatic Usage

You can also use the package programmatically in your Node.js applications:

```typescript
import { crawl } from 'crawldown'

async function main() {
  const results = await crawl({
    url: 'https://example.com',       // Required: URL to crawl
    depth: 1,                         // Optional: how deep to crawl links (default: 0)
    browserPath: '/path/to/chrome',   // Optional: custom browser executable path
    concurrency: 4,                   // Optional: number of concurrent pages (default: 4)
  })

  // Each result contains:
  // - url: string
  // - title: string
  // - markdown: string
  for (const result of results) {
    console.log(`Title: ${result.title}`)
    console.log(`URL: ${result.url}`)
    console.log(`Content:\n${result.markdown}`)
  }
}
```
## Credits

This project was inspired by:

- [repomix](https://github.com/yamadashy/repomix) - An awesome CLI tool to combine whole repositories into a single markdown file
- [crawl4ai](https://github.com/unclecode/crawl4ai) - A feature-rich Python web crawler


## License

[Mozilla Public License 2.0](./LICENSE.md) License
