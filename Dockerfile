FROM node:24-bookworm

ENV TZ="Europe/Oslo"

RUN npx -y playwright@1.54.0 install --with-deps

WORKDIR /app
RUN chmod 777 /app

COPY . /app

RUN npm install

CMD ["npm", "run", "test"]
