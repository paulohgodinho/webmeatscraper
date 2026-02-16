/**
 * Core scraper logic using Playwright
 * Handles the actual web scraping and HTML retrieval
 */

import { chromium, Browser, Page } from 'playwright';
import { meatExtractor } from 'meatscraper';

interface ScraperOptions {
  timeout?: number;
  waitFor?: string | null;
}

interface ExtractedData {
  content: string;
  image: string | null;
  metadata: Record<string, any>;
}

/**
 * Scrape a URL and return extracted content data
 * @param url - The URL to scrape
 * @param options - Optional configuration
 * @param options.timeout - Timeout in milliseconds (default: 30000)
 * @param options.waitFor - CSS selector to wait for (optional)
 * @returns The extracted content, image, and metadata from the page
 * @throws {Error} If the URL is invalid or scraping fails
 */
async function scrapeUrl(url: string, options: ScraperOptions = {}): Promise<ExtractedData> {
  const { timeout = 60000, waitFor = null } = options;

  // Validate URL
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: "${url}". Please provide a valid HTTP/HTTPS URL.`);
  }

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Track start time for performance metrics
    const fetchStartTime = Date.now();
    
    // Launch browser in headless mode
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    let html: string;

    try {
      // Navigate to the URL with timeout and wait for network to be idle
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: timeout,
      });

      // Wait for optional selector if provided
      if (waitFor) {
        await page.waitForSelector(waitFor, { timeout: timeout });
      }

      // Get the full HTML content
      html = await page.content();
    } catch (error) {
      if (isTimeoutError(error)) {
        html = await page.content();
        if (isEmptyContent(html)) {
          throw new Error(`Timeout after 60s while trying to load: "${url}". No content received.`);
        }
        if (process.env.DEBUG) {
          console.error(`[DEBUG] Timeout reached, using partial content (${html.length} chars)`);
        }
      } else {
        throw error;
      }
    }

    // Debug: Print full HTML if DEBUG environment variable is set
    if (process.env.DEBUG) {
      const fetchEndTime = Date.now();
      const fetchDuration = fetchEndTime - fetchStartTime;
      
      console.error(`[DEBUG] URL: ${url}`);
      console.error(`[DEBUG] Fetch took: ${fetchDuration}ms`);
      console.error(html);
    }

    // Extract structured content using meatscraper
    const extractedData = await meatExtractor(html, { url });

    return {
      content: extractedData.content,
      image: extractedData.metadata.image || null,
      metadata: extractedData.metadata
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide meaningful error messages
    if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error(`DNS resolution failed for URL: "${url}"`);
    } else if (errorMessage.includes('Timeout')) {
      throw new Error(`Timeout after ${Math.round(timeout / 1000)}s while trying to load: "${url}"`);
    } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED')) {
      throw new Error(`Connection refused for URL: "${url}"`);
    }
    // Re-throw original error with context
    throw new Error(`Failed to scrape "${url}": ${errorMessage}`);
  } finally {
    // Clean up: close the page and browser
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Validate if a string is a valid URL
 * @param url - The URL to validate
 * @returns True if valid, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if an error is a Playwright timeout error
 * @param error - The error to check
 * @returns True if it's a timeout error, false otherwise
 */
function isTimeoutError(error: any): boolean {
  return error.message && error.message.includes('Timeout');
}

/**
 * Check if HTML content is empty or contains only empty HTML tags
 * @param html - The HTML content to check
 * @returns True if content is empty, false if it has meaningful content
 */
function isEmptyContent(html: string): boolean {
  const trimmed = html.trim();
  // Check for completely empty or very minimal content
  if (trimmed.length < 50) {
    return true;
  }
  // Check for basic empty HTML structure
  const emptyHtmlPattern = /^<\s*html[^>]*>\s*(?:<\s*head[^>]*>.*?<\/head>\s*)?(?:<\s*body[^>]*>\s*<\/body>\s*)?<\/html>$/i;
  return emptyHtmlPattern.test(trimmed);
}

export {
  scrapeUrl,
  isValidUrl,
  ScraperOptions,
  ExtractedData,
};
