# Specify the base Docker image with Playwright and Chrome pre-installed
# Using Node.js 20 and Playwright Chrome image
FROM apify/actor-node-playwright-chrome:20

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock first to leverage Docker layer caching
# This way, dependencies are cached and only re-installed if package files change
COPY package.json yarn.lock ./

# Switch to root user for installing global packages and building
# The base image uses 'myuser' by default, but we need root for npm global install
USER root

# Install TypeScript globally so it's available for all build steps
RUN npm install -g typescript@5.3.3

# Install dependencies - meatscraper build will fail but that's ok, we'll rebuild it
RUN yarn install --frozen-lockfile || true

# Build meatscraper manually since its postinstall script failed
# Override strict mode to work around missing type definitions
RUN cd node_modules/meatscraper && \
    tsc --strict false && \
    cd /app

# Copy the application source code
# This is done after yarn install so that code changes don't invalidate the dependency cache
COPY src ./src

# Copy TypeScript configuration
COPY tsconfig.json ./

# Build TypeScript to JavaScript
# Disable noImplicitAny to work around missing @types/express and @types/node
RUN tsc --noImplicitAny false

# Remove dev dependencies to keep the final image small
# meatscraper will fail to build again, so we'll use || true and rebuild it next
RUN yarn install --production --frozen-lockfile || true

# Rebuild meatscraper since production install removed the dist folder
RUN cd node_modules/meatscraper && tsc --strict false && cd /app

# Expose port 7878 for the web server
# This doesn't actually publish the port, but documents that the app uses this port
EXPOSE 7878

# Set the entry point
# This will run the application and pass arguments directly
ENTRYPOINT ["node", "dist/main.js"]
# Default to server mode if no arguments provided
CMD []
