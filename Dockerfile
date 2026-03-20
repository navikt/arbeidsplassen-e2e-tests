FROM node:24-trixie-slim AS build

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

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-dev

COPY --from=build /app /app

WORKDIR /app

CMD ["/usr/bin/pnpm", "run", "test"]