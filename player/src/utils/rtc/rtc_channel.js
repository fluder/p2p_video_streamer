import { Queue } from "../queue";

import { RTCChannelClosed, RTCPeerOperationTimeout } from "./rtc_errors";


export class RTCChannel {
    constructor(dataChannel, peerConnection) {
        this.dataChannel = dataChannel;
        this.peerConnection = peerConnection;

        this._msgQueue = new Queue();
        this._error = undefined;
        this.isOpened = false;
    }

    open() {
        this.isOpened = true;
        this.dataChannel.binaryType = "arraybuffer";
        this.dataChannel.onclose = (e) => {
            this._error = new RTCChannelClosed();
            this._msgQueue.flush(this._error);
        };
        this.dataChannel.onmessage = (event) => {
            this._msgQueue.put(event.data);
        };
    }

    send(data) {
        this.dataChannel.send(data);
    }

    async recv(options) {
        options = Object.assign({
            timeout: 10000
        }, options || {});
        if (this._error)
            throw this._error;

        try {
            return await this._msgQueue.get({timeout: options.timeout});
        } catch (err) {
            if (err.message == "Timeout") {
                throw new RTCPeerOperationTimeout();
            }
            throw err
        }
    }

    hasMessages() {
        return this._msgQueue._elements.length > 0
    }

    close() {
        this.dataChannel.close();
    }
}