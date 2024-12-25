FROM node:18-alpine as builder
RUN apk add --no-cache --virtual .build-deps python3 make g++
COPY package.json package-lock.json entrypoint.sh ./
COPY . .
RUN npm ci

FROM node:18-alpine as app
WORKDIR /usr/src/app
COPY . .
COPY --from=builder ./node_modules ./node_modules
COPY ./.git/ ./.git
COPY entrypoint.sh .
EXPOSE 3001
CMD ./entrypoint.sh
