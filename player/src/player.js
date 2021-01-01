import { Buffer } from "./buffer";
import { BufferMetadataController } from "./controllers/buffer_metadata_controller";
import { BufferDataController } from "./controllers/buffer_data_controller";
import { PlaybackController } from "./controllers/playback_controller";
import { UIController } from "./controllers/ui_controller";
import { ChunkServerController } from "./controllers/chunk_server_controller";
import { HTTPFetcher } from "./fetchers/http_fetcher";
import { P2PFetcher } from "./fetchers/p2p_fetcher";
import { RTCPeer } from "./utils/rtc";
import { StatsController } from "./controllers/stats_controller";


export class Player {
    constructor(
        playerElement,
        dashUrl,
        options,
    ) {
        options = Object.assign({
            statsHost: undefined,
            p2pHost: undefined,
            p2pRoomId: "default"
        }, options || {});
        this.playerElement = playerElement;
        this.dashUrl = dashUrl;
        this.state = PLAYER_STATE_PAUSED;
        this.statsHost = options.statsHost;
        this.p2pHost = options.p2pHost;

        this._videoElement = this.playerElement.getElementsByClassName("video")[0];
        this._loaderElement = this.playerElement.getElementsByClassName("loader")[0];
        this._playButtonElement = this.playerElement.getElementsByClassName("play-button")[0];
        this._fullScreenButtonElement = this.playerElement.getElementsByClassName("fullscreen-button")[0];

        this._buffer = new Buffer();
        if (this.p2pHost !== undefined) {
            this._rtcPeer = new RTCPeer(this.p2pHost, options.p2pRoomId);
            this._chunkServerController = new ChunkServerController(this);
        }
        this._bufferMetadataController = new BufferMetadataController(this);
        this._bufferDataController = new BufferDataController(this, new HTTPFetcher(), new P2PFetcher(this._rtcPeer), 15, 30);
        this._playbackController = new PlaybackController(this);
        this._uiController = new UIController(this);

        if (this.statsHost !== undefined) {
            this._statsController = new StatsController(this);
        }
    }

    play() {
        this.state = PLAYER_STATE_PLAYING;
        this._bufferMetadataController.play();
        this._rtcPeer.start();
        this._chunkServerController.play();
    }

    pause() {
        this.state = PLAYER_STATE_PAUSED;
        this._bufferMetadataController.pause();
        this._chunkServerController.pause();
        this._rtcPeer.stop();
    }
}


export const
    PLAYER_STATE_PAUSED = 1,
    PLAYER_STATE_PLAYING = 2;