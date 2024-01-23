# 1 Build Stage
FROM node:14 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 2 Production Stage
FROM node:14-alpine
WORKDIR /app
COPY --from=builder /app .
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
