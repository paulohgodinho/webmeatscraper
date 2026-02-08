# Specify the base Docker image with Playwright and Chrome pre-installed
# Using Node.js 20 and Playwright Chrome image
FROM apify/actor-node-playwright-chrome:20

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock first to leverage Docker layer caching
# This way, dependencies are cached and only re-installed if package files change
COPY package.json yarn.lock ./

# Switch to root user for installing packages and building
USER root

# Install all dependencies (including devDependencies for building)
# The base image sets NODE_ENV=production, so we need to override it temporarily
RUN NODE_ENV= yarn install --frozen-lockfile

# Copy the application source code
# This is done after yarn install so that code changes don't invalidate the dependency cache
COPY src ./src

# Copy TypeScript configuration
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN ./node_modules/.bin/tsc

# Remove dev dependencies to keep the final image small
RUN yarn install --production --frozen-lockfile

# Expose port 7878 for the web server
# This doesn't actually publish the port, but documents that the app uses this port
EXPOSE 7878

# Set the entry point
# This will run the application and pass arguments directly
ENTRYPOINT ["node", "dist/main.js"]
# Default to server mode if no arguments provided
CMD []
