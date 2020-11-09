FROM node:12-alpine

RUN apk add --update --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./index.js ./
COPY ./node-server-crt.pem ./
COPY ./node-server-key.pem ./

EXPOSE 8080
EXPOSE 8443
CMD ["npm","start"]