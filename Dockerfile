FROM node:10

WORKDIR /app

COPY webapp/package.json .
COPY webapp/package-lock.json .

RUN npm install

COPY webapp .

EXPOSE 3000

CMD npm start