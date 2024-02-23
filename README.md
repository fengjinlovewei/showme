## 配置
docker network create fengjin-network

docker build . -t fengjin/showme

docker run -it --name showme --network fengjin-network --network-alias showme -p 3000:3000 -d fengjin/showme
