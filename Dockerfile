FROM mcr.microsoft.com/playwright:v1.54.1-noble

ENV TZ="Europe/Oslo"

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV DEBUG=pw:browser,pw:api

CMD ["npm", "run", "test"]
