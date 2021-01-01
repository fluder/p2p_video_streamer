import PCancelable from "p-cancelable";
import delay from "delay";


export class P2PFetcher {
    constructor(rtcPeer) {
        this.rtcPeer = rtcPeer;
        this._mesh = {};
        this._waiters = [];

        if (this.rtcPeer) {
            this._manageMesh();
        }
    }

    async _manageMesh() {
        while (1) {
            try {
                if (Object.keys(this._mesh).length < 8) {
                    let others = (await this.rtcPeer.getOthers())
                        .filter((x) => { return Object.keys(this._mesh).indexOf(x) == -1 });

                    if (others.length > 0) {
                        let peer = others[Math.floor(Math.random() * others.length)];
                        let rtcChannel = await this.rtcPeer.createChannel(peer);
                        this._mesh[peer] = rtcChannel;
                        console.log(`[P2PFetcher._manageMesh()] New channel created with peer ${peer}`);
                        (async () => {
                            try {
                                await this._manageRtcChannel(rtcChannel);
                            } catch (err) {
                                console.log("[P2PFetcher._manageMesh()] Error in _manageRtcChannel()");
                                console.log(err);
                            }
                            this._mesh[peer].close();
                            delete this._mesh[peer];
                        })();
                    }
                }
            } catch (err) {
                console.log("[P2PFetcher._manageMesh()] Error creating channel");
                console.log(err);
            }

            await delay(1000);
        }
    }

    async _manageRtcChannel(rtcChannel) {
        let bufferMap = [], msg;

        while (1) {
            msg = JSON.parse(await rtcChannel.recv());
            if (msg.type == "buffer_map") {
                bufferMap = msg.buffer_map;
            }
            for (let i in this._waiters) {
                let waiter = this._waiters[i];

                if (bufferMap.indexOf(waiter.chunkId) != -1) {
                    this._waiters.splice(i, 1);
                } else {
                    continue;
                }

                try {
                    console.log(`[P2PFetcher._manageRtcChannel()] Fetching ${waiter.chunkId}`);
                    rtcChannel.send(JSON.stringify({
                        "type": "get_chunk",
                        "id": waiter.chunkId
                    }));

                    let chunkLength;
                    while (1) {
                        msg = JSON.parse(await rtcChannel.recv());
                        if (msg.type == "chunk_start") {
                            chunkLength = msg.length;
                            break;
                        }
                    }

                    let chunk = new Uint8Array(chunkLength),
                        bytesReceived = 0;
                    while (bytesReceived < chunkLength) {
                        let bit = new Uint8Array(await rtcChannel.recv());

                        chunk.set(bit, bytesReceived);
                        bytesReceived += bit.length;
                    }
                    waiter.resolve(chunk);
                } catch (err) {
                    if (!waiter.canceled) {
                        this._waiters.push(waiter);
                    }
                    throw err;
                }
            }
        }
    }

    fetch(chunkInfo) {
        return new PCancelable((onCancel, resolve, reject) => {
            if (this.rtcPeer === undefined) {
                return
            }
            let waiter = {
                resolve,
                reject,
                chunkId: chunkInfo.id,
                canceled: false
            };
            this._waiters.push(waiter);
            onCancel(() => {
                waiter.canceled = true;
                if (this._waiters.indexOf(waiter) != -1) {
                    this._waiters.splice(this._waiters.indexOf(waiter), 1);
                }
            });
        });
    }
}
