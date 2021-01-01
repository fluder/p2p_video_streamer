import delay from "delay";
import PCancelable from "p-cancelable";

import { parseMpdManifest } from "../mpd";
import { ChunkInfo, StreamInfo } from "../buffer";
import { getSecureHeaderValue } from "../utils";
import { fetch } from "../utils/http";


export class BufferMetadataController {
    constructor(player) {
        this.player = player;
        this._promise = undefined;
    }

    play() {
        if (this._promise === undefined) {
            let promise = this._pollDashUrl()
            promise.catch((err) => {
                if (!promise.canceled) {
                    throw err;
                }
            });
            this._promise = promise;
        }
    }

    pause() {
        if (this._promise !== undefined) {
            this._promise.cancel();
            this._promise = undefined;
        }
    }

    _pollDashUrl() {
        return new PCancelable((onCancel, resolve, reject) => {
            let isCanceled = false;
            (async () => {
                let currentAvailabilityStartTime = undefined;

                while (!isCanceled) {
                    try {
                        let response = await fetch(this.player.dashUrl, {
                            headers: { Auth: getSecureHeaderValue(this.player.dashUrl) }
                        }),
                            mpdManifest = parseMpdManifest(response.text, this.player.dashUrl);

                        if (mpdManifest.availabilityStartTime != currentAvailabilityStartTime) {
                            let streamInfoList = [];
                            for (let streamId in mpdManifest.streams) {
                                let response = await fetch(mpdManifest.streams[streamId].initSegmentUrl, {
                                    headers: { Auth: getSecureHeaderValue(mpdManifest.streams[streamId].initSegmentUrl) },
                                    arrayBuffer: true
                                }),
                                    initChunkData = response.data;
                                streamInfoList.push(new StreamInfo(
                                    streamId,
                                    mpdManifest.streams[streamId].mimeType,
                                    mpdManifest.streams[streamId].codecs,
                                    initChunkData
                                ));
                            }

                            this.player._buffer.initializeStreams(streamInfoList);
                            currentAvailabilityStartTime = mpdManifest.availabilityStartTime;
                        }

                        let chunkInfoList = [];
                        for (let streamId in mpdManifest.streams) {
                            if (mpdManifest.streams[streamId].segments[0].time == 0) {
                                break;
                            }

                            for (let segment of mpdManifest.streams[streamId].segments) {
                                chunkInfoList.push(new ChunkInfo(
                                    streamId,
                                    segment.time,
                                    segment.duration,
                                    segment.url
                                ));
                            }
                        }
                        this.player._buffer.updateChunkInfoList(chunkInfoList);
                    } catch (err) {
                        console.log("[BufferMetadataController._pollDashUrl()] Error during poll iteration");
                        console.log(err);
                    }
                    await delay(2000);
                }
            })();
            onCancel(() => { isCanceled = true; });
        });
    }
}