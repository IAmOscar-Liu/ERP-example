# Stage 1: Build the frontend
FROM node:22-alpine AS frontend
WORKDIR /app

# Install git to clone the repository
RUN apk add --no-cache git

RUN git clone https://github.com/IAmOscar-Liu/ERP-example-frontend.git .
RUN npm install
RUN npm run build

# Stage 2: Build the backend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Final image
FROM node:22-alpine

ENV NODE_ENV=production
 
WORKDIR /app
 
# Copy production dependencies from builder
COPY --from=builder /app .
 
# Copy built frontend from frontend stage and rename it
COPY --from=frontend /app/dist ./dist/client


# The application inside the container will run on port 4000
EXPOSE 4000
 
CMD ["npm", "start"]
