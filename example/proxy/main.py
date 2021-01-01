#!/usr/bin/python3
import json
import os

from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader('/'))
template = env.get_template('nginx.conf')
with open('/etc/nginx/nginx.conf', 'w') as fd:
    fd.write(template.render({
        'SERVICES': json.loads(os.environ['SERVICES']),
        'SERVER_NAME': os.getenv('SERVER_NAME', '127.0.0.1:8081'),
        'MODE': os.getenv("MODE")
    }))

os.system('nginx')