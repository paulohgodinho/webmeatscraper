/**
 * CLI mode handler
 * Handles scraping when a URL is provided as a command-line argument
 */

import { scrapeUrl } from './scraper';

/**
 * Run the scraper in CLI mode
 * @param url - The URL to scrape
 * @returns Never resolves - process exits
 */
async function runCliMode(url: string): Promise<never> {
  try {
    console.error(`Scraping: ${url}`);
    const html = await scrapeUrl(url);
    // Output HTML to stdout
    console.log(html);
    process.exit(0);
  } catch (error) {
    // Output error to stderr
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}

export { runCliMode };
