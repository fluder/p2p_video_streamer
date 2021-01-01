import PCancelable from "p-cancelable";


export class HTTPError extends Error {}
export class HTTPTimeout extends HTTPError { constructor() { super("Connection timeout"); } }
export class HTTPConnectionError extends HTTPError { constructor() { super("Connection failed"); } }


export function fetch(url, options) {
    options = Object.assign({
        timeout: 10000,
        method: "GET",
        headers: {},
        arrayBuffer: false
    }, options || {});

    return new PCancelable((onCancel, resolve, reject) => {
        let xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {
            if (xhr.readyState != 4) return;
            if (xhr.status == 0) {
                reject(new HTTPConnectionError());
            } else {
                resolve(new HTTPResponse(xhr));
            }
        };
        xhr.open(options.method, url, true);
        if (options.arrayBuffer) {
            xhr.responseType = "arraybuffer";
        }
        for (let key in options.headers) {
            xhr.setRequestHeader(key, options.headers[key]);
        }
        xhr.send();
        setTimeout(() => {
            reject(new HTTPTimeout());
            xhr.abort();
        }, options.timeout);

        onCancel(() => {
            xhr.abort();
        });
    });
}


export class HTTPResponse {
    constructor(xhr) {
        this.status = xhr.status;
        if (xhr.responseType == "arraybuffer") {
            this.data = xhr.response;
            if (this.data) {
                this.data = new Uint8Array(this.data);
            }
        } else {
            this.text = xhr.responseText;
        }
    }
}
