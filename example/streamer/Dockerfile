FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:jonathonf/ffmpeg-4 && \
    apt-get update && \
    apt-get install -y ffmpeg python3

ADD main.sh /main.sh
ADD stream.mp4 /stream.mp4
RUN chmod +x /main.sh

CMD ["/main.sh"]