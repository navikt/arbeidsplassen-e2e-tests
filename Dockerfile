FROM node:24-bookworm

ENV TZ="Europe/Oslo"
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-install
ENV HOME=/app

RUN npx -y playwright@1.54.0 install --with-deps

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . /app

RUN chown -R 1069:1069 /app

ENV DEBUG=pw:browser,pw:api

CMD ["npm", "run", "test"]
