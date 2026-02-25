FROM node:24-bookworm-slim

ENV TZ="Europe/Oslo"
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-install
ENV HOME=/app

RUN apt update
RUN apt upgrade -y

RUN pnpm exec -y playwright@1.54.0 install --with-deps

WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . /app

RUN chown -R 1069:1069 /app

CMD ["pnpm", "run", "test"]
