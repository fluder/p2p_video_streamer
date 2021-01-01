FROM nginx
RUN apt-get update && apt-get install -y python3-pip
RUN pip3 install jinja2
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /srv/index.html
COPY js /srv/js

CMD ["nginx"]