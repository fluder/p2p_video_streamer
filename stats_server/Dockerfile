FROM ubuntu:20.04

RUN apt-get update && apt-get install -y build-essential python python3-pip
ADD requirements.txt /opt/requirements.txt
RUN pip3 install -r /opt/requirements.txt

WORKDIR /opt/app
CMD ["python3", "-u", "main.py"]
EXPOSE 80

ADD . /opt/app