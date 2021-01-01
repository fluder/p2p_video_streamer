import { CHUNK_STATE_NULL } from "../buffer";


export class BufferDataController {
    constructor(player, directFetcher, p2pFetcher, directWindow, distributionFactor) {
        this.player = player;
        this.directFetcher = directFetcher;
        this.p2pFetcher = p2pFetcher;
        this.directWindow = directWindow;
        this.distributionFactor = distributionFactor;

        this._fetcherInfoMap = {};
        this._randomOffset = Math.floor(Math.random() * distributionFactor);

        this.player._buffer.addEventListener("chunkmapupdated", this._onChunkMapUpdated.bind(this));
        this.player._buffer.addEventListener("flush", this._onFlush.bind(this));
    }

    _onChunkMapUpdated(e) {
        let chunkMap = e.chunkMap,
            firstPresentationTime = this.player._buffer.getFirstPresentationTime();

        for (let chunkId in this._fetcherInfoMap) {
            if (chunkMap[chunkId] === undefined || chunkMap[chunkId].state != CHUNK_STATE_NULL) {
                this._fetcherInfoMap[chunkId].fetchPromise.cancel();
                delete this._fetcherInfoMap[chunkId]
            }
        }

        for (let chunkId in chunkMap) {
            if (chunkMap[chunkId].state != CHUNK_STATE_NULL) {
                continue;
            }
            let chunkInfo = chunkMap[chunkId].chunkInfo,
                fetcher;

            if (
                (
                    (chunkInfo.presentationTime + this._randomOffset) % this.distributionFactor == 0 ||
                    (chunkInfo.presentationTime + this._randomOffset) + chunkInfo.duration >= (chunkInfo.presentationTime + this._randomOffset) + (this.distributionFactor - (chunkInfo.presentationTime + this._randomOffset) % this.distributionFactor)
                ) ||
                chunkInfo.presentationTime - firstPresentationTime <= this.directWindow
            ) {
                fetcher = this.directFetcher;
            } else {
                fetcher = this.p2pFetcher;
            }

            if (this._fetcherInfoMap[chunkId] !== undefined && this._fetcherInfoMap[chunkId].fetcher != fetcher) {
                this._fetcherInfoMap[chunkId].fetchPromise.cancel();
                delete this._fetcherInfoMap[chunkId];
            }

            if (this._fetcherInfoMap[chunkId] === undefined) {
                let fetchPromise = fetcher.fetch(chunkInfo);
                this._fetcherInfoMap[chunkId] = new FetcherInfo(fetchPromise, fetcher);
                fetchPromise
                    .then((chunkData) => {
                        this.player._buffer.setChunkData(chunkId, chunkData);
                    })
                    .catch((err) => {
                        if (!fetchPromise.canceled) {
                            console.log("[BufferDataController._onChunkMapUpdated()] Error in fetcher");
                            console.log(err);
                        }
                    });
            }
        }

    }

    _onFlush() {
        for (let chunkId in this._fetcherInfoMap) {
            this._fetcherInfoMap[chunkId].fetchPromise.cancel();
        }
        this._fetcherInfoMap = {};
    }
}


class FetcherInfo {
    constructor(fetchPromise, fetcher) {
        this.fetchPromise = fetchPromise;
        this.fetcher = fetcher;
    }
}