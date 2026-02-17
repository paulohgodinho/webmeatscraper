#!/usr/bin/env node

/**
 * Main entry point for the Web Scraper application
 * Detects the mode (CLI or Server) based on command-line arguments
 */

import { runCliMode } from './cli-mode';
import { runServerMode } from './server-mode';

/**
 * Determine the mode and run accordingly
 */
async function main(): Promise<never> {
  // Get command-line arguments (skip node and script path)
  const args = process.argv.slice(2);

  // Check if a URL was provided as the first argument
  if (args.length > 0) {
    // CLI mode: URL provided as argument
    const url = args[0];
    // This call never returns - process exits
    return await runCliMode(url);
  } else {
    // Server mode: No arguments, start HTTP server
    // This call never returns - server runs forever
    return await runServerMode();
  }
}

// Run the application
main().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Fatal error:', errorMessage);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT (Ctrl+C). Shutting down gracefully...');
  process.exit(0);
});

