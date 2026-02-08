/**
 * CLI mode handler
 * Handles scraping when a URL is provided as a command-line argument
 */

import { scrapeUrl } from './scraper';
// @ts-ignore - meatscraper package.json exists
import meatscraperPackage from 'meatscraper/package.json';

/**
 * Run the scraper in CLI mode
 * @param url - The URL to scrape
 * @returns Never resolves - process exits
 */
async function runCliMode(url: string): Promise<never> {
  try {
    console.error(`Using meatscraper v${meatscraperPackage.version}`);
    console.error(`Scraping: ${url}`);
    const data = await scrapeUrl(url);
    // Output extracted data as JSON to stdout
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (error) {
    // Output error to stderr
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}

export { runCliMode };
