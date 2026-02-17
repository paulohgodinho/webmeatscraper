/**
 * Server mode handler
 * Runs an HTTP server on port 42452 (configurable via WEBMEATSCRAPER_PORT env var) that accepts scraping requests via JSON
 */

import express, { Request, Response, NextFunction } from 'express';
import { scrapeUrl, isValidUrl, ExtractedData } from './scraper';
// @ts-ignore - meatscraper package.json exists
import meatscraperPackage from 'meatscraper/package.json';

const PORT = parseInt(process.env.WEBMEATSCRAPER_PORT || '42452', 10);

interface ScrapeRequest {
  url?: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
  example?: { url: string };
}

type SuccessResponse = ExtractedData;

/**
 * Run the scraper in server mode
 */
async function runServerMode(): Promise<never> {
  const app = express();

  // Middleware to parse JSON
  app.use(express.json());

   /**
    * Health check endpoint
    */
   app.get('/health', (_req: Request, res: Response) => {
     res.json({ status: 'ok' });
   });

   /**
    * Main scraping endpoint
    * POST /scrape
    * Request body: {"url": "https://example.com"}
    * Response: {"html": "<html>..."}
    */
   app.post('/scrape', async (req: Request<unknown, unknown, ScrapeRequest>, res: Response<SuccessResponse | ErrorResponse>): Promise<void> => {
     try {
       const { url } = req.body;

       // Validate request body
       if (!url) {
         res.status(400).json({
           error: 'Missing required field: "url"',
           example: { url: 'https://example.com' },
         });
         return;
       }

       // Validate URL format
       if (!isValidUrl(url)) {
         res.status(400).json({
           error: `Invalid URL: "${url}". Please provide a valid HTTP/HTTPS URL.`,
         });
         return;
       }

       // Scrape the URL
       const data = await scrapeUrl(url);

       // Return successful response with extracted data
       res.json(data);
     } catch (error) {
       // Return error response with 500 status
       const errorMessage = error instanceof Error ? error.message : String(error);
       res.status(500).json({
         error: errorMessage,
       });
     }
   });

   /**
    * 404 handler
    */
   app.use((_req: Request, res: Response) => {
     res.status(404).json({
       error: 'Not Found',
       message: 'Available endpoints: GET /health, POST /scrape',
     });
   });

   /**
    * Error handler
    */
   app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
     console.error('Unhandled error:', err);
     res.status(500).json({
       error: 'Internal Server Error',
       message: err.message,
     });
   });

  // Start the server - returns a promise that never resolves
  return new Promise<never>(() => {
    app.listen(PORT, '0.0.0.0', () => {
      const commitHash = process.env.COMMIT_HASH || 'unknown';

      console.log(`Web Scraper Server`);
      console.log(`==================`);
      console.log(`Commit: ${commitHash}`);
      console.log(`Using meatscraper v${meatscraperPackage.version}`);
      console.log(`Port: ${PORT}`);
      
      // Show relevant environment variables
      const envVars = [];
      if (process.env.WEBMEATSCRAPER_PORT) {
        envVars.push(`WEBMEATSCRAPER_PORT=${process.env.WEBMEATSCRAPER_PORT}`);
      }
      if (process.env.DEBUG) {
        envVars.push(`DEBUG=${process.env.DEBUG}`);
      }
      if (envVars.length > 0) {
        console.log(`Environment: ${envVars.join(', ')}`);
      }
      
      console.log(`\nEndpoints:`);
      console.log(`  - GET  /health              Health check`);
      console.log(`  - POST /scrape              Scrape a URL`);
      console.log(`\nExample request:`);
      console.log(`  curl -X POST http://localhost:${PORT}/scrape \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -d '{"url": "https://example.com"}'`);
    });
  });
}

export { runServerMode };
