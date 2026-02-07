# webmeatscraper

A simple web scraper that downloads webpages and extracts clean content using [Playwright](https://playwright.dev/) and [meatscraper](https://github.com/paulohgodinho/meatscraper).

## Features

- **Dual Mode Operation**: Run as CLI tool or HTTP API server
- **Content Extraction**: Extracts clean text content, metadata, and primary images
- **Rich Metadata**: Extracts 20+ metadata fields including title, author, publish date, and platform-specific data
- **Platform Support**: Special handling for YouTube, Twitter, Amazon, Reddit
- **Docker Ready**: Runs in Docker with Playwright's Chromium browser

## Installation

```bash
# Install dependencies
yarn install

# Build the project
yarn build
```

## Usage

### CLI Mode

Pass a URL as an argument to scrape it and output structured JSON:

```bash
node dist/main.js https://example.com
```

**Output:**
```json
{
  "content": "This domain is for use in documentation examples...",
  "image": null,
  "metadata": {
    "title": "Example Domain",
    "description": "Example description",
    "author": "John Doe",
    "publisher": "Example Publication",
    "datePublished": "2024-01-15T10:30:00Z",
    "url": "https://example.com",
    ...
  }
}
```

### Server Mode

Run without arguments to start an HTTP server on port 7878:

```bash
node dist/main.js
```

**Available Endpoints:**

- `GET /health` - Health check
- `POST /scrape` - Scrape a URL and extract content

**Example Request:**
```bash
curl -X POST http://localhost:7878/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Response:**
```json
{
  "content": "Clean text content from the page...",
  "image": "https://example.com/hero-image.jpg",
  "metadata": {
    "title": "Example Domain",
    "description": "...",
    "author": "...",
    ...
  }
}
```

## Response Structure

The scraper returns structured data with three main fields:

- **content** (string): Clean, readable text extracted from the page
- **image** (string|null): Primary image URL from the page
- **metadata** (object): Rich metadata including:
  - Basic: title, description, author, publisher
  - Dates: datePublished, dateModified
  - Images: image, logo
  - Platform-specific: YouTube (videoId, channelName), Twitter (handle), Amazon (price, productTitle), Reddit (subreddit, author)

## Docker

Build and run the Docker container:

```bash
# Build
docker build -t webmeatscraper .

# Run in server mode
docker run -p 7878:7878 webmeatscraper

# Run in CLI mode
docker run webmeatscraper https://example.com
```

## Development

```bash
# Build
yarn build

# Run in development mode
yarn dev
```

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **Playwright** - Browser automation for web scraping
- **Express** - HTTP server framework
- **meatscraper** - Content extraction using Metascraper, Readability, and DOMPurify

## License

MIT
