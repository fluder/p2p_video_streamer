import delay from "delay";

import { PLAYER_STATE_PAUSED } from "../player";


export class UIController {
    constructor(player) {
        this.player = player;

        this.player._fullScreenButtonElement
            .addEventListener("click", () => {
                if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
                    if (this.player.playerElement.requestFullscreen) {
                        this.player.playerElement.requestFullscreen();
                    } else if (this.player.playerElement.mozRequestFullScreen) {
                        this.player.playerElement.mozRequestFullScreen();
                    } else if (this.player.playerElement.webkitRequestFullscreen) {
                        this.player.playerElement.webkitRequestFullscreen();
                    }
                } else {
                    let cancelFunc = (document.cancelFullScreen || document.mozCancelFullScreen || document.webkitCancelFullScreen);
                    cancelFunc.call(document);
                }
            });

        this.player._playButtonElement
            .addEventListener("click", () => {
                this.player._videoElement.play();
                this.player.play();
            });

        this.player._videoElement
            .addEventListener("click", () => {
                this.player.pause();
            });

        this._renderDynamicElements();
    }

    async _renderDynamicElements() {
        while (1) {
            try {
                if ((this.player._videoElement.readyState < 3 || this.player._videoElement.paused) && this.player.state != PLAYER_STATE_PAUSED) {
                    this.player._loaderElement.style.display = "block";
                } else {
                    this.player._loaderElement.style.display = "none";
                }

                if (this.player.state == PLAYER_STATE_PAUSED) {
                    this.player.playerElement.getElementsByClassName("play-button")[0].style.display = "block";
                } else {
                    this.player.playerElement.getElementsByClassName("play-button")[0].style.display = "none";
                }

            } catch(err) {
                console.log("[UIController._renderDynamicElements()] Unhandled exception");
                console.log(err);
            }

            await delay(50)
        }
    }
}