FROM node:4-onbuild

RUN npm install -g gulp
RUN gulp build

EXPOSE 8080