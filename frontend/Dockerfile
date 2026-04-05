FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
FROM node:20-alpine AS base
RUN apk add --no-cache nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Alpine's nginx package reads site config from http.d (not conf.d)
COPY nginx.conf /etc/nginx/http.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
