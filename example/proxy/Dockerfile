FROM nginx
RUN apt-get update && apt-get install -y python3-pip
RUN pip3 install jinja2
COPY nginx.conf /etc/nginx/nginx.conf
ADD nginx.conf /nginx.conf
ADD main.py /main.py
RUN chmod +x /main.py

ENTRYPOINT /main.py