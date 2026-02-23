FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production=false --legacy-peer-deps

COPY . .
RUN npx tsc

RUN npm prune --production --legacy-peer-deps

EXPOSE 3001

CMD ["node", "dist/server.js"]
