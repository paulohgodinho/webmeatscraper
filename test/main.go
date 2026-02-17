package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const defaultPort = "42452"
const defaultTimeout = 80

var testWebsites = []string{
	"https://httpbin.org/html",     // Simple HTML page
	"https://example.com",          // Basic website
	"https://news.ycombinator.com", // Dynamic content
	"https://go.dev/doc/",
	"https://www.youtube.com/watch?v=fx07vPbRaGU",
	"https://dashy.to/",
	"https://github.com/bastienwirtz/homer",
}

func main() {
	var timeoutSeconds int
	flag.IntVar(&timeoutSeconds, "timeout", defaultTimeout, "Timeout in seconds for each scrape request")
	flag.Parse()

	port := os.Getenv("WEBMEATSCRAPER_PORT")
	if port == "" {
		port = defaultPort
	}

	baseURL := fmt.Sprintf("http://localhost:%s", port)

	// Health check
	if !checkHealth(baseURL) {
		fmt.Printf("ERROR: Server not reachable. Ensure the scraper server is running on port %s\n", port)
		os.Exit(1)
	}

	fmt.Printf("✓ Server is healthy, starting scrape tests (timeout: %ds)...\n", timeoutSeconds)

	// Test each website
	for _, url := range testWebsites {
		fmt.Printf("\nTesting: %s\n", url)
		result, err := scrapeWebsite(baseURL, url, timeoutSeconds)
		if err != nil {
			fmt.Printf("✗ Failed: %v\n", err)
		} else {
			fmt.Printf("✓ Success:\n%s\n", result)
		}
	}
}

func checkHealth(baseURL string) bool {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(baseURL + "/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

func scrapeWebsite(baseURL, url string, timeoutSeconds int) (string, error) {
	payload := map[string]string{"url": url}
	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", baseURL+"/scrape", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	// Parse the JSON response
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to parse JSON response: %v", err)
	}

	// Truncate the content field if it exists
	if content, ok := response["content"].(string); ok && len(content) > 200 {
		response["content"] = content[:200] + " [truncated]"
	}

	// Marshal back to JSON for display
	truncatedBody, err := json.MarshalIndent(response, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal response: %v", err)
	}

	return string(truncatedBody), nil
}
