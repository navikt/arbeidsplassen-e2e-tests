FROM node:22-bookworm

ENV TZ="Europe/Oslo"

RUN npx -y playwright@1.54.0 install --with-deps

WORKDIR /app

COPY . /app

RUN npm install

CMD ["npm", "run", "test"]
