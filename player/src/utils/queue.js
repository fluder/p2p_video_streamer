export class QueueError extends Error {}
export class QueueOperationTimeout extends QueueError { constructor() { super("Timeout"); }}
export class QueueFlushed extends QueueError { constructor() { super("Flushed"); } }


export class Queue {
    constructor() {
        this._elements = [];
        this._waiter = undefined;
    }

    put(element) {
        if (this._waiter !== undefined) {
            let resolve = this._waiter.resolve;
            this._waiter = undefined;
            resolve(element);
        } else {
            this._elements.push(element);
        }
    }

    get(options) {
        if (this._waiter !== undefined) {
            throw new QueueError("Waiter for queue is already registered");
        }
        options = Object.assign({
            timeout: undefined
        }, options || {});

        return new Promise(
            (resolve, reject) => {
                if (this._elements.length != 0) {
                    resolve(this._elements.pop());
                } else {
                    this._waiter = { resolve, reject };
                    if (options.timeout) {
                        setTimeout(() => {
                            reject(new QueueOperationTimeout());
                            if (this._waiter && this._waiter.resolve == resolve) {
                                this._waiter = undefined;
                            }
                        }, options.timeout);
                    }
                }
            }
        );
    }

    flush(error) {
        this._elements = [];
        if (this._waiter) {
            this._waiter.reject(error || new QueueFlushed());
        }
        this._waiter = undefined;
    }
}
