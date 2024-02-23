#1、基于镜像node版本
FROM node:18.13.0-alpine

ENV TZ Asia/Shanghai

#2、作者
MAINTAINER TanDong
#3、参数，node的环境为生产环境
ENV NODE_ENV=production
#4、任意ip
ENV HOST 0.0.0.0

WORKDIR /showme

COPY .output/ /showme

ENV NUXT_PORT=3000

#8、暴露端口3000，默认端口
EXPOSE 3000
#12、start
CMD ["node","./server/index.mjs"]

