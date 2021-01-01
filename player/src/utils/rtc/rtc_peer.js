import { v4 as uuidv4 } from "uuid";
import delay from "delay";

import { Queue } from "../queue";
import { fetch } from "../http";
import { WebsocketClient } from "../websocket";

import { RTCChannel } from "./rtc_channel";
import { RTCPeerOperationError, RTCPeerOperationTimeout } from "./rtc_errors";


const rtcDefaultConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
}, rtcDefaultConnection = {
    optional:
        []
}, sdpConstraints = {
    mandatory: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
    }
};

const RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
const RTCIceCandidate = window.mozRTCIceCandidate || window.webkitRTCIceCandidate || window.RTCIceCandidate;
const RTCSessionDescription = window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;


export class RTCPeer {
    constructor(p2pHost, roomId) {
        this.p2pHost = p2pHost;
        this.roomId = roomId;
        this.peerId = uuidv4();
        this.isStarted = false;

        this._websocketClient = undefined;
        this._signalingSendQueue = new Queue();
        this._pendingChannels = {};
        this._channelsQueue = new Queue();

        this._manageWebsocketSend();
    }

    async _manageWebsocket(url) {
        while (true) {
            let websocketClient = new WebsocketClient(url);

            try {
                await websocketClient.open();
                websocketClient.send(JSON.stringify({
                    type: "join",
                    room_id: this.roomId,
                    peer_id: this.peerId,
                }));
                this._websocketClient = websocketClient;

                while (true) {
                    let msg = await websocketClient.recv();

                    try {
                        msg = JSON.parse(msg);
                    } catch (err) {
                        console.log(`[RTCPeer._manageWebsocket()] JSON parse error: ${err}`);
                        continue;
                    }

                    try {
                        this._handleSignalingMessage(msg);
                    } catch (err) {
                        console.log(`[RTCPeer._manageWebsocket()] Signaling message handling error: ${err}`);
                    }
                }

            } catch (err) {
                if (!this.isStarted) {
                    return;
                }
                console.log("RTC WS connection error, respawning: " + err);
            }

            await delay(1000);
        }
    }

    async _manageWebsocketSend() {
        while (1) {
            let msg = await this._signalingSendQueue.get();

            try {
                msg = JSON.stringify(msg);
            } catch (err) {
                console.log(`[RTCPeer._manageWebsocketSend()] JSON parse error: ${err}`);
                continue;
            }

            while (1) {
                try {
                    this._websocketClient.send(msg);
                    break;
                } catch (err) {
                    await delay(1000)
                }
            }
        }
    }

    _createRtcChannel(peerId, offerId, timeoutCb) {
        let peerConnection = new RTCPeerConnection(rtcDefaultConfig, rtcDefaultConnection),
            rtcChannel = new RTCChannel(undefined, peerConnection);

        peerConnection.onicecandidate = (e) => {
            if (!peerConnection || !e || !e.candidate) return;

            this._signalingSendQueue.put({
                type: "ice",
                peer_id: peerId,
                offer_id: offerId,
                candidate: e.candidate
            });
        };

       setTimeout(() => {
            if(this._pendingChannels[offerId] !== undefined) {
                let rtcChannel = this._pendingChannels[offerId];
                delete this._pendingChannels[offerId];

                if(!rtcChannel.isOpened && rtcChannel.dataChannel !== undefined) {
                    rtcChannel.dataChannel.close();
                }
            }
            if (timeoutCb !== undefined) {
                timeoutCb();
            }
        }, 10000);

        this._pendingChannels[offerId] = rtcChannel;

        return rtcChannel;
    }

    _handleSignalingMessage(msg) {
        if (msg.type == "offer") {
            let offerId = msg.offer_id,
                peerId = msg.peer_id,
                sdp = msg.sdp,
                rtcChannel = this._createRtcChannel(peerId, offerId);

            rtcChannel.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            rtcChannel.peerConnection.ondatachannel = (e) => {
                rtcChannel.dataChannel = e.channel;
                rtcChannel.dataChannel.onopen = () => {
                    rtcChannel.open();
                    this._channelsQueue.put(rtcChannel);
                }
            };
            (async () => {
                let sdp = await rtcChannel.peerConnection.createAnswer(sdpConstraints);
                rtcChannel.peerConnection.setLocalDescription(sdp);
                this._signalingSendQueue.put({
                    type: "answer",
                    peer_id: peerId,
                    offer_id: offerId,
                    sdp: sdp
                });
            })();
        } else if (msg.type == "answer") {
            let offerId = msg.offer_id,
                sdp = msg.sdp,
                rtcChannel = this._pendingChannels[offerId];
            if (rtcChannel !== undefined) {
                rtcChannel.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        } else if (msg.type == "ice") {
            let offerId = msg.offer_id,
                candidate = msg.candidate,
                rtcChannel = this._pendingChannels[offerId];
            if (rtcChannel !== undefined) {
                rtcChannel.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }
    }

    async waitForChannel() {
        return await this._channelsQueue.get();
    }

    async getOthers() {
        let response, peers;

        try {
            response = await fetch(`http://${this.p2pHost}/peers/${this.roomId}`);
        } catch (err) {
            console.log(`[RTCPeer.getOthers()] HTTP request to http://${this.p2pHost}/others failed: ${err}`);
            throw new RTCPeerOperationError();
        }

        try {
            peers = JSON.parse(response.text);
        } catch (err) {
            console.log(`[RTCPeer.getOthers()] JSON parse error: ${err}`);
            throw new RTCPeerOperationError();
        }

        let i = peers.indexOf(this.peerId);
        if (i != -1) {
            peers.splice(i, 1);
        }

        return peers
    }

    async createChannel(peerId) {
        return new Promise((resolve, reject) => {
            let offerId = uuidv4(),
                rtcChannel = this._createRtcChannel(peerId, offerId, () => { reject(new RTCPeerOperationTimeout()) });

            rtcChannel.dataChannel = rtcChannel.peerConnection.createDataChannel(offerId);
            rtcChannel.dataChannel.onopen = () => {
                rtcChannel.open();
                resolve(rtcChannel);
            };

            (async () => {
                let sdp = await rtcChannel.peerConnection.createOffer(sdpConstraints);
                rtcChannel.peerConnection.setLocalDescription(sdp);
                this._signalingSendQueue.put({
                    type: "offer",
                    peer_id: peerId,
                    offer_id: offerId,
                    sdp: sdp
                });
            })();
        });
    }

    start() {
        if (!this.isStarted) {
            this.isStarted = true;
            this._manageWebsocket(`ws://${this.p2pHost}/signaling`);
        }
    }

    stop() {
        if (this.isStarted) {
            this.isStarted = false;
            if (this._websocketClient !== undefined && this._websocketClient.isOpened) {
                this._websocketClient.close();
            }
            this._websocketClient = undefined;
        }
    }
}