# Base image with Node.js
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build TypeScript code
RUN npm run build

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Expose application port (change if needed)
EXPOSE 4000

# Start the app
CMD ["npm", "start"]
