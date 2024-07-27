#基于镜像node版本
FROM node:18.13.0-alpine as builder

ENV TZ Asia/Shanghai

#参数，node的环境为生产环境
ENV NODE_ENV=production


WORKDIR /app

# 这一段也可以写成 COPY package*.json /app/
COPY package.json /app/
COPY package-lock.json /app/

# npm ci是根据package-lock.json来下载的，版本锁定，比npm i 稳定
# npm cache clean --force 这个命令会删除所有缓存数据，确保你的后续安装使用的是最新的包。
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

