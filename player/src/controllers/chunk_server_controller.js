import { CHUNK_STATE_DOWNLOADED } from "../buffer";


export class ChunkServerController {
    constructor(player) {
        this.player = player;
        this.paused = false;
        this._rtcChannels = [];
        this._bufferMap = [];

        this._manageRtcPeer();
        this.player._buffer.addEventListener("chunkdataupdated", this._onChunksChanged.bind(this));
    }

    async _manageRtcPeer() {
        while (1) {
            let rtcChannel = await this.player._rtcPeer.waitForChannel();
            if (this._rtcChannels.length >= 40) {
                rtcChannel.close();
                continue
            }
            this._rtcChannels.push(rtcChannel);
            (async () => {
                try {
                    await this._manageRtcChannel(rtcChannel)
                } catch (err) {
                    if (!this.paused) {
                        console.log("[ChunkServerController._manageRtcPeer()] _manageRtcChannel() error");
                        console.log(err);
                    }
                    rtcChannel.close();
                    this._rtcChannels.splice(this._rtcChannels.indexOf(rtcChannel), 1);
                }
            })();
        }
    }

    _onChunksChanged() {
        this._bufferMap = [];
        for (let key of Object.keys(this.player._buffer.chunkMap)) {
            if (this.player._buffer.chunkMap[key].state == CHUNK_STATE_DOWNLOADED) {
                this._bufferMap.push(key);
            }
        }
    }

    async _manageRtcChannel(rtcChannel) {
        console.log("[ChunkServerController._manageRtcChannel()] Managing new channel");
        let msg;

        while (1) {
            rtcChannel.send(JSON.stringify({
                type: "buffer_map",
                buffer_map: this._bufferMap
            }));

            try {
                msg = await rtcChannel.recv({ timeout: 1000 });
            } catch (err) {
                if (err.message == "Timeout") {
                    continue;
                }
                throw err;
            }

            msg = JSON.parse(msg);

            if (msg.type == "get_chunk") {
                if (this.player._buffer.chunkMap[msg.id] !== undefined && this.player._buffer.chunkMap[msg.id].state == CHUNK_STATE_DOWNLOADED) {
                    let chunkData = this.player._buffer.chunkMap[msg.id].data;
                    rtcChannel.send(JSON.stringify({
                        type: "chunk_start",
                        length: chunkData.length
                    }));
                    let bytesSent = 0,
                        chunkSize = 8192;
                    while (bytesSent < chunkData.length) {
                        if (bytesSent + chunkSize > chunkData.length) {
                            chunkSize = chunkData.length - bytesSent;
                        }
                        let chunk = chunkData.subarray(bytesSent, bytesSent + chunkSize);
                        rtcChannel.send(chunk);
                        bytesSent += chunkSize;
                    }

                    rtcChannel.send(JSON.stringify({
                        type: "chunk_end"
                    }));
                } else {
                    rtcChannel.send(JSON.stringify({
                        "type": "error"
                    }));
                }
            }
        }

    }

    play() {
        this.paused = false;
    }

    pause() {
        this.paused = true;
        for (let rtcChannel of this._rtcChannels) {
            rtcChannel.close();
        }
        this._rtcChannels = [];
    }
}