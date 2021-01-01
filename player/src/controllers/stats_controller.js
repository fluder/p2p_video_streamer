import delay from "delay";

import { WebsocketClient } from "../utils/websocket";
import { PLAYER_STATE_PAUSED } from "../player";


export class StatsController {
    constructor(player) {
        this.player = player;

        this._manageWebsocketConnection("ws://" + this.player.statsHost + "/submit");
    }

    async _manageWebsocketConnection(url) {
        while (true) {
            let websocketClient = new WebsocketClient(url);

            try {
                await websocketClient.open();
                await this._submitStats(websocketClient);
            } catch (err) {
                console.log("[StatsController._manageWebsocketConnection()] Stats WS connection error, respawning");
                console.log(err);
                await delay(1000);
            }
        }
    }

    async _submitStats(websocketClient) {
        let state, chunks, streams;

        while (1) {
            if (this.player.state == PLAYER_STATE_PAUSED) {
                state = "PAUSED";
            } else {
                if (this.player._videoElement.readyState < 3) {
                    state = "STUCK"
                } else {
                    state = "PLAYING"
                }
            }

            chunks = Object
                .values(this.player._buffer.chunkMap)
                .sort((a, b) => a.chunkInfo.presentationTime - b.chunkInfo.presentationTime)
                .map((x) => ({
                    "presentationTime": x.chunkInfo.presentationTime,
                    "state": x.state,
                    "streamId": x.chunkInfo.streamId
                }));

            streams = {};
            for (let chunk of chunks) {
                let streamId = chunk.streamId;

                if (streams[streamId] === undefined) {
                    streams[streamId] = []
                }
                delete chunk.streamId;
                streams[streamId].push(chunk);
            }

            websocketClient.send(JSON.stringify({
                "state": state,
                "chunks": streams,
                "url": this.player.dashUrl
            }));

            await delay(1000)
        }
    }
}