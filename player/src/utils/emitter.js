export class Emitter {
    constructor() {
        this.listeners = {};
    }

    addEventListener(type, callback) {
        if (!(type in this.listeners)) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    }

    removeEventListener(type, callback) {
        if (!(type in this.listeners)) {
            return;
        }
        const stack = this.listeners[type];
        for (let i = 0, l = stack.length; i < l; i++) {
            if (stack[i] === callback) {
                stack.splice(i, 1);
                return;
            }
        }
    }

    dispatchEvent(event) {
        if (!(event.type in this.listeners)) {
            return;
        }
        const debounce = callback => {
            setTimeout(() => callback.call(this, event));
        };
        const stack = this.listeners[event.type];
        for (let i = 0, l = stack.length; i < l; i++) {
            debounce(stack[i]);
        }
        return !event.defaultPrevented;
    }
}
