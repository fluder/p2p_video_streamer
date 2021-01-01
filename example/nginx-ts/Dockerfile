FROM ubuntu:20.04

RUN apt-get update && apt-get install -y git wget build-essential libpcre3-dev libssl-dev zlib1g-dev
RUN cd /usr/src && \
    wget https://nginx.org/download/nginx-1.19.6.tar.gz && \
    tar xvf nginx-1.19.6.tar.gz && \
    cd nginx-1.19.6 && \
    git clone https://github.com/arut/nginx-rtmp-module && \
    ./configure --add-module=/usr/src/nginx-1.19.6/nginx-rtmp-module --prefix=/usr && \
    make && \
    make install

ADD nginx.conf /etc/nginx/nginx.conf
ADD entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-c", "/etc/nginx/nginx.conf"]