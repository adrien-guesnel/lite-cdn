# Install all node_modules and build the project
FROM node:16.13.2-alpine AS build

WORKDIR /usr/app
COPY package.json yarn.lock ./
RUN yarn install 

COPY . .
RUN yarn build
RUN yarn install --prod

FROM node:16.13.2-alpine AS prod

WORKDIR /usr/app

COPY --from=build /usr/app/dist ./
COPY --from=build /usr/app/node_modules ./node_modules

EXPOSE 11111

CMD node ./index.js
