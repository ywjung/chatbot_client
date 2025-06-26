# Dockerfile.frontend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 빌드 산출물만 복사 (정적 파일만 복사 가능)
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
