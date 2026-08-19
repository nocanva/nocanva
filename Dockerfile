FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build
ENV NODE_ENV=production

EXPOSE 3000 3100
CMD ["npm", "start"]
