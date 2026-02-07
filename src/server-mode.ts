/**
 * Server mode handler
 * Runs an HTTP server on port 7878 that accepts scraping requests via JSON
 */

import express, { Request, Response, NextFunction } from 'express';
import { scrapeUrl, isValidUrl } from './scraper';

const PORT = 7878;

interface ScrapeRequest {
  url?: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
  example?: { url: string };
}

interface SuccessResponse {
  html: string;
}

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
       const html = await scrapeUrl(url);

       // Return successful response
       res.json({ html });
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
      console.log(`Server started on port ${PORT}`);
      console.log(`Endpoints:`);
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
