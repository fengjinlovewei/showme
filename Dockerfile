#1、基于镜像node版本
FROM node:18.13.0-alpine as builder

ENV TZ Asia/Shanghai

#3、参数，node的环境为生产环境
ENV NODE_ENV=production


WORKDIR /app

COPY package.json /app/
COPY package-lock.json /app/

RUN npm ci && npm cache clean --force

ADD . /app

RUN npm run build

FROM node:18.13.0-alpine

WORKDIR /app

COPY --from=builder /app  /app

#4、任意ip
ENV HOST 0.0.0.0
# ENV NUXT_HOST=0.0.0.0
# ENV NUXT_PORT=3000

#8、暴露端口3000，默认端口
EXPOSE 3000
#12、start
ENTRYPOINT ["node",".output/server/index.mjs"]

