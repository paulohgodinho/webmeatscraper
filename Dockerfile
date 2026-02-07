# Specify the base Docker image with Playwright and Chrome pre-installed
# Using Node.js 20 and Playwright Chrome image
FROM apify/actor-node-playwright-chrome:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
# This way, dependencies are cached and only re-installed if package files change
COPY package.json ./

# Install NPM packages (including dev dependencies for TypeScript compilation)
# Set quiet progress mode to reduce noise in build logs
# Use --no-package-lock since we don't have a lock file
RUN npm --quiet set progress=false \
    && npm install --production=false --no-package-lock \
    && echo "Installed NPM packages:" \
    && (npm list --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Copy the application source code
# This is done after npm install so that code changes don't invalidate the dependency cache
COPY src ./src

# Copy TypeScript configuration
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies to keep the final image small
RUN npm prune --omit=dev

# Expose port 7878 for the web server
# This doesn't actually publish the port, but documents that the app uses this port
EXPOSE 7878

# Set the entry point
# This will run the application and pass arguments directly
ENTRYPOINT ["node", "dist/main.js"]
# Default to server mode if no arguments provided
CMD []
