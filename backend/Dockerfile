FROM node:20-alpine as base

WORKDIR /app

# Install dependencies (cache optimized)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "src/app.js"]