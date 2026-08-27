FROM node:20

WORKDIR /app

# Build Backend Dependencies
COPY package*.json ./
RUN npm ci

# Build Frontend Dependencies & Dist
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --include=dev

COPY . .

# Accept VITE_GOOGLE_CLIENT_ID at build time with fallback
ARG VITE_GOOGLE_CLIENT_ID=663003203662-kpfq4d8j6p4qrit9pvn89ng2n3rigdt9.apps.googleusercontent.com
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN cd frontend && npm run build

EXPOSE 2000

CMD ["npm", "start"]