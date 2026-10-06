FROM node:24-trixie-slim AS builder

ENV TZ="Europe/Oslo"
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-install
ENV HOME=/app

# RUN apt update
# RUN apt upgrade -y

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN corepack enable pnpm && corepack install -g pnpm@latest
RUN pnpm install --frozen-lockfile
RUN pnpm exec playwright install --with-deps

COPY . /app

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-slim

COPY --from=builder /app /app

WORKDIR /app

CMD ["/usr/bin/pnpm", "run", "test"]
