# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app/client
COPY client/ ./
RUN npm install && npm run build

# Stage 2: Setup the Node.js server
FROM node:18-alpine

WORKDIR /app/server
COPY server/ ./
RUN npm install --production

# Copy built React files from Stage 1
COPY --from=build /app/client/dist ../client/dist

# Create data directory for SQLite and uploads directory
RUN mkdir -p /app/server/data && mkdir -p /app/server/uploads

# Expose port
EXPOSE 9001

# Start the server
CMD ["node", "index.js"]
