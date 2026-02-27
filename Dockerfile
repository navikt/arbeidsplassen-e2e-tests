FROM node:24-bookworm-slim AS base

ENV TZ="Europe/Oslo"
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-install
ENV HOME=/app

RUN apt update
RUN apt upgrade -y
RUN corepack enable pnpm && corepack install -g pnpm@latest

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm exec playwright install --with-deps

COPY . /app

#RUN chown -R 1069:1069 /app

CMD ["pnpm", "run", "test"]
