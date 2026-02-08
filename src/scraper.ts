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
  const { timeout = 30000, waitFor = null } = options;

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
    const html = await page.content();

    // Debug: Print full HTML if DEBUG environment variable is set
    if (process.env.DEBUG) {
      const fetchEndTime = Date.now();
      const fetchDuration = fetchEndTime - fetchStartTime;
      
      console.error(`[DEBUG] URL: ${url}`);
      console.error(`[DEBUG] Fetch took: ${fetchDuration}ms`);
      console.error(html);
    }

    // Extract structured content using meatscraper
    const extractedData = await meatExtractor(html);

    return extractedData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide meaningful error messages
    if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error(`DNS resolution failed for URL: "${url}"`);
    } else if (errorMessage.includes('Timeout')) {
      throw new Error(`Timeout after ${timeout}ms while trying to load: "${url}"`);
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

export {
  scrapeUrl,
  isValidUrl,
  ScraperOptions,
  ExtractedData,
};
