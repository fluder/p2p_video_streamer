import json
from aiohttp import web
import aiohttp_cors
from collections import defaultdict

rooms = defaultdict(lambda: {})


async def parse_msg(ws):
    data = await ws.receive_str()
    try:
        msg = json.loads(data)
    except Exception:
        raise Exception("Message JSON parse error")
    if not isinstance(msg, dict):
        raise Exception("Message JSON parse error")

    return msg


async def signaling_handler(request):
    print("New websocket connection")
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    msg = await parse_msg(ws)
    if msg["type"] != "join":
        raise Exception("Unexpected message for join: %s" % msg)
    room_id = msg["room_id"]
    peer_id = msg["peer_id"]
    rooms[room_id][peer_id] = ws
    print("New peer: %s" % peer_id)

    try:
        while True:
            msg = await parse_msg(ws)
            if "peer_id" in msg and msg["peer_id"] in rooms[room_id]:
                to_peer_id = msg["peer_id"]
                msg["peer_id"] = peer_id
                rooms[room_id][to_peer_id].send_str(json.dumps(msg))
    except Exception:
        del rooms[room_id][peer_id]
        raise


async def peers_handler(request):
    return web.Response(body=json.dumps(list(rooms[request.match_info["room_id"]].keys())))


def main():
    app = web.Application()
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
        )
    })
    app.router.add_get("/signaling", signaling_handler)
    app.router.add_get("/peers/{room_id}", peers_handler)
    for route in list(app.router.routes()):
        cors.add(route)
    web.run_app(app, port=80)


if __name__ == "__main__":
   main()