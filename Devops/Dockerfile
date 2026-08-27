FROM node:20 AS builder

WORKDIR /app

# Build Backend Dependencies
COPY package*.json ./
RUN npm ci

# Build Frontend Dependencies & Dist
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --include=dev

COPY . .
RUN cd frontend && npm run build

EXPOSE 2000

CMD ["npm", "start"]