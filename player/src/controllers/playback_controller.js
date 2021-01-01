import delay from "delay";

import { PLAYER_STATE_PAUSED, PLAYER_STATE_PLAYING } from "../player";


export class PlaybackController {
    constructor(player) {
        this.player = player;

        this.player._buffer.addEventListener("mediasourceready", (e) => {
            this.player.playerElement.getElementsByClassName("video")[0].src = window.URL.createObjectURL(e.mediaSource);
        });

        this._poll();
    }

    async _poll() {
        let prevState;

        while (1) {
            try {
                if (this.player.state == PLAYER_STATE_PAUSED) {
                    this.player._videoElement.pause();
                } else if (this.player.state == PLAYER_STATE_PLAYING) {
                    let firstPresentationTime = this.player._buffer.getFirstPresentationTime();

                    if ((this.player.state != prevState || this.player._videoElement.readyState < 3) && this.player._videoElement.currentTime < firstPresentationTime) {
                        this.player._videoElement.currentTime = firstPresentationTime + 0.1;
                    }
                    if (this.player.state != prevState || this.player._videoElement.readyState < 3 || this.player._videoElement.paused) {
                        this.player._videoElement.play();
                    }
                }
                prevState = this.player.state;
            } catch (err) {
                console.log("[PlaybackController._poll()] Error in pool loop");
                console.log(err);
            }
            await delay(50);
        }
    }
}