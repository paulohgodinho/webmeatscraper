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

  // Perform browser health check
  const healthCheckResult = await performBrowserHealthCheck();
  if (!healthCheckResult) {
    throw new Error('Browser health check failed: Unable to fetch test HTML. Browser may be misconfigured or network unavailable.');
  }

  // Overall operation timeout (10s buffer beyond page timeout)
  const overallTimeout = timeout + 10000;

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Overall scraping operation timed out after ${Math.round(overallTimeout / 1000)}s for "${url}".`)), overallTimeout);
  });

  // Main scraping logic as a promise
  const scrapingPromise = performScraping(url, timeout, waitFor);

  // Race them
  return Promise.race([scrapingPromise, timeoutPromise]);
}

/**
 * Perform the actual scraping operation
 */
async function performScraping(url: string, timeout: number, waitFor: string | null): Promise<ExtractedData> {
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
        timeout: timeout - 5000, // Wait for timeout-5s, then return partial content
      });

      // Wait for optional selector if provided
      if (waitFor) {
        await page.waitForSelector(waitFor, { timeout: timeout - 5000 });
      }

      // Get the full HTML content
      html = await page.content();
    } catch (error) {
      if (isTimeoutError(error)) {
        html = await page.content();
        if (isEmptyContent(html)) {
          throw new Error(`Page load timed out after ${Math.round((timeout - 5000) / 1000)}s: "${url}". No content was received from the server.`);
        }
        if (process.env.DEBUG) {
          console.error(`[DEBUG] Timeout reached after ${Math.round((timeout - 5000) / 1000)}s, using partial content (${html.length} chars)`);
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

    // Provide meaningful error messages with specific diagnostics
    if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error(`DNS resolution failed: Cannot resolve hostname for "${url}". Check the URL or network connection.`);
    } else if (errorMessage.includes('Timeout')) {
      throw new Error(`Page load timed out after ${Math.round((timeout - 5000) / 1000)}s: "${url}". The page took too long to load (networkidle not reached).`);
    }
    // Re-throw original error with context for any other failures
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

/**
 * Perform a quick browser health check to ensure Playwright can fetch HTML
 * @returns HTML content from test endpoint, or null if failed
 */
async function performBrowserHealthCheck(): Promise<string | null> {
  const testUrl = 'https://httpbin.org/html';
  let testBrowser: Browser | null = null;
  let testPage: Page | null = null;

  try {
    testBrowser = await chromium.launch({ headless: true });
    testPage = await testBrowser.newPage();
    await testPage.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const content = await testPage.content();
    return content && content.trim().length > 10 ? content : null;
  } catch (error) {
    return null;
  } finally {
    if (testPage) await testPage.close().catch(() => {});
    if (testBrowser) await testBrowser.close().catch(() => {});
  }
}

export {
  scrapeUrl,
  isValidUrl,
  ScraperOptions,
  ExtractedData,
};
