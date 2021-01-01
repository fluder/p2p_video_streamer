import os
import json
import traceback
from datetime import datetime

import aiohttp
import aiohttp_jinja2
import jinja2
from aiohttp import web
from uuid import uuid4

import trafaret as t

clients = {}


submit_message_validator = t.Dict(
    state=t.String,
    chunks=t.Mapping(
        t.String,
        t.List(t.Dict(
            presentationTime=t.Float,
            state=t.String
        ))
    ),
    url=t.String
)


async def submit_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    peername = request.transport.get_extra_info("peername")
    if peername is not None:
        client_host, client_port = peername
    else:
        client_host = None
        client_port = None
    if "X-Forwarded-For" in request.headers:
        client_host = request.headers["X-Forwarded-For"]

    client_id = str(uuid4())
    clients[client_id] = {
        "ip": client_host,
        "dt": datetime.now(),
        "state": "UNKNOWN",
        "chunks": {},
        "user_agent": request.headers["User-Agent"]
    }

    try:
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    if not submit_message_validator.check(data):
                        raise ValueError()
                    clients[client_id].update(data)
                except Exception:
                    clients[client_id]["state"] = "ERROR"

            elif msg.type == aiohttp.WSMsgType.ERROR:
                print("ws connection closed with exception %s" % ws.exception())
    except Exception:
        print("unhandled exception during processing message: %s" % traceback.format_exc())

    print("websocket connection closed")
    del clients[client_id]

    return ws


async def get_info_handler(request):
    return web.Response(body=json.dumps(clients))


@aiohttp_jinja2.template("stat.html")
async def stat_handler(request):
    return {
        "clients": sorted(clients.items(), key=lambda x: x[1]["dt"])
    }


def main():
    app = web.Application()
    aiohttp_jinja2.setup(
        app,
        loader=jinja2.FileSystemLoader("templates")
    )
    app.router.add_get("/submit", submit_handler)
    app.router.add_get("/get_info", get_info_handler)
    app.router.add_get("/stat", stat_handler)
    web.run_app(app, port=80)


if __name__ == "__main__":
   main()