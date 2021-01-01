import { Queue } from "./queue";


export class WebsocketClientError extends Error {}
export class WebsocketClientClosed extends WebsocketClientError {
    constructor(wsError) {
        super("Websocket connection closed");
        this.wsError = wsError;
    }
}


export class WebsocketClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.isOpened = false;
        this._error = new WebsocketClientError("Not opened");
        this._ws = undefined;
        this._msgQueue = new Queue();
    }

    open() {
        if (this.isOpened)
            throw new WebsocketClientError("Already opened");

        return new Promise((resolve, reject) => {
            this._error = undefined;
            this._ws = new WebSocket(this.wsUrl);
            this._ws.onopen = () => {
                this.isOpened = true;
                resolve();
            };
            this._ws.onmessage = (event) => {
                this._msgQueue.put(event.data);
            };
            this._ws.onclose = this._ws.onerror = (error) => {
                this._error = new WebsocketClientClosed(error);
                if (!this.isOpened) {
                    reject(this._error);
                }
                this._msgQueue.flush(this._error);
                this.isOpened = false;
            }
        });
    }

    send(data) {
        if (this._error)
            throw this._error;

        this._ws.send(data);
    }

    async recv() {
        if (this._error)
            throw this._error;

        return await this._msgQueue.get();
    }

    close() {
        this._ws.close();
    }
}