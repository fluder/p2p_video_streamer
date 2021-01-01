import md5 from "md5";

import { roundTo } from "./utils";
import { Emitter } from "./utils/emitter";
import { Queue } from "./utils/queue";


export class Buffer extends Emitter {
    constructor() {
        super();

        this.streamMap = {};
        this.chunkMap = {};

        this._mediaSource = undefined;
        this._appendQueue = new Queue();
        this._appendSourceBuffers();
    }

    initializeStreams(streamInfoList) {
        this._mediaSource = new MediaSource();
        this.streamMap = {};
        this.chunkMap = {};
        this._appendQueue.flush();
        this.dispatchEvent(new Event("flush"));

        for (let streamInfo of streamInfoList) {
            this.streamMap[streamInfo.id] = new Stream(streamInfo, undefined);
        }

        this._mediaSource.addEventListener("sourceopen", () => {
            for (let streamInfo of streamInfoList) {
                this.streamMap[streamInfo.id].sourceBuffer = this._mediaSource.addSourceBuffer(`${streamInfo.mimeType}; codecs="${streamInfo.codecs}"`);
                this.streamMap[streamInfo.id].sourceBuffer.appendBuffer(streamInfo.initChunkData);
            }
        });

        let event = new Event("mediasourceready");
        event.mediaSource = this._mediaSource;
        this.dispatchEvent(event);
    }

    updateChunkInfoList(chunkInfoList) {
        let chunkIds = chunkInfoList.map((x) => x.id);
        for (let chunkId in this.chunkMap) {
            if (chunkIds.indexOf(chunkId) == -1) {
                delete this.chunkMap[chunkId];
            }
        }
        for (let chunkInfo of chunkInfoList) {
            if (this.chunkMap[chunkInfo.id] === undefined) {
                this.chunkMap[chunkInfo.id] = new Chunk(chunkInfo, CHUNK_STATE_NULL, undefined);
            }
        }

        let event = new Event("chunkmapupdated");
        event.chunkMap = this.chunkMap;
        this.dispatchEvent(event);
    }

    getFirstPresentationTime() {
        let minPresentationTimeByStreamId = {};

        for (let chunkId in this.chunkMap) {
            let streamId = this.chunkMap[chunkId].chunkInfo.streamId,
                presentationTime = this.chunkMap[chunkId].chunkInfo.presentationTime;

            if (
                minPresentationTimeByStreamId[streamId] === undefined ||
                presentationTime < minPresentationTimeByStreamId[streamId]
            ) {
                minPresentationTimeByStreamId[streamId] = presentationTime;
            }
        }

        return Math.max(...Object.values(minPresentationTimeByStreamId))
    }

    setChunkData(chunkId, data) {
        this.chunkMap[chunkId].data = data;
        this.chunkMap[chunkId].state = CHUNK_STATE_DOWNLOADED;
        this._appendQueue.put(this.chunkMap[chunkId]);

        let event = new Event("chunkdataupdated");
        event.chunkMap = this.chunkMap;
        this.dispatchEvent(event);
    }

    _waitSourceBuffer(sourceBuffer) {
        return new Promise(
            function(resolve) {
                if (!sourceBuffer.updating) {
                    resolve();
                } else {
                    sourceBuffer.addEventListener("updateend", () => resolve());
                }
            }
        );
    }

    async _appendSourceBuffers() {
        while (1) {
            let chunk;

            try {
                chunk = await this._appendQueue.get();

                let streamId = chunk.chunkInfo.streamId,
                    chunkData = chunk.data,
                    stream = this.streamMap[streamId];
                if (stream === undefined || stream.sourceBuffer === undefined) {
                    continue;
                }
                await this._waitSourceBuffer(stream.sourceBuffer);
                stream.sourceBuffer.appendBuffer(chunkData);
            } catch (err) {
                console.log("[Buffer._appendSourceBuffers()] Unhandled exception");
                console.log(err);
                continue;
            }
        }
    }
}


export class StreamInfo {
    constructor(
        id,
        mimeType,
        codecs,
        initChunkData
    ) {
        this.id = id;
        this.mimeType = mimeType;
        this.codecs = codecs;
        this.initChunkData = initChunkData;
    }
}


export class ChunkInfo {
    constructor(
        streamId,
        presentationTime,
        duration,
        originUrl
    ) {
        this.id = md5(`${streamId}${presentationTime}`);
        this.streamId = streamId;
        this.presentationTime = roundTo(presentationTime, 2);
        this.duration = roundTo(duration, 2);
        this.originUrl = originUrl;
    }
}


export class Stream {
    constructor(
        streamInfo,
        sourceBuffer
    ) {
        this.streamInfo = streamInfo;
        this.sourceBuffer = sourceBuffer;
    }
}


export class Chunk {
    constructor(
        chunkInfo,
        state,
        data
    ) {
        this.chunkInfo = chunkInfo;
        this.state = state;
        this.data = data;
    }
}


export const
    CHUNK_STATE_NULL = "NULL",
    CHUNK_STATE_DOWNLOADED = "DOWNLOADED";
