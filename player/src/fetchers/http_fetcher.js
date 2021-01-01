import delay from "delay";
import PCancelable from "p-cancelable";

import { getSecureHeaderValue } from "../utils";
import { fetch } from "../utils/http";


export class HTTPFetcher {
    fetch(chunkInfo) {
        return new PCancelable((onCancel, resolve, reject) => {
            let fetchPromise, isCanceled = false;

            (async () => {
                while (true) {
                    try {
                        console.log("Fetching " + chunkInfo.originUrl);
                        let response = await fetch(chunkInfo.originUrl, {
                            headers: { Auth: getSecureHeaderValue(chunkInfo.originUrl) },
                            arrayBuffer: true
                        });
                        resolve(response.data);
                        break;
                    } catch (err) {
                        console.log(err);
                    }
                    await delay(500);
                }
            })();

            onCancel(() => {
                isCanceled = true;
                if (fetchPromise !== undefined) {
                    fetchPromise.cancel();
                }
            });
        });
    }
}
