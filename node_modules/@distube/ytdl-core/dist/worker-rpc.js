import { parentPort, Worker } from "node:worker_threads";
const isCall = (message) => typeof message === "object" && message !== null && "call" in message;
const isReply = (message) => typeof message === "object" && message !== null && "reply" in message;
export function startWorker(file, events = {}) {
    const worker = new Worker(file);
    const pending = new Map();
    let nextCall = 0;
    let stopped = false;
    worker.unref();
    const stop = (cause) => {
        if (stopped)
            return;
        stopped = true;
        const waiters = [...pending.values()];
        pending.clear();
        for (const waiter of waiters)
            waiter.reject(cause);
        events.onStop?.();
    };
    worker.on("message", (message) => {
        if (!isReply(message)) {
            events.onMessage?.(message);
            return;
        }
        const waiter = pending.get(message.reply);
        pending.delete(message.reply);
        if (pending.size === 0)
            worker.unref();
        if ("error" in message)
            waiter?.reject(Object.assign(new Error(message.error), { name: message.name }));
        else
            waiter?.resolve(message.result);
    });
    worker.on("error", stop);
    worker.on("exit", (code) => stop(new Error(`Worker exited with code ${code}`)));
    return {
        call(request) {
            if (stopped)
                return Promise.reject(new Error("Worker stopped"));
            const call = nextCall++;
            worker.ref();
            return new Promise((resolve, reject) => {
                pending.set(call, { resolve, reject });
                worker.postMessage({ call, request });
            });
        },
        post(message, transfer) {
            if (!stopped)
                worker.postMessage(message, transfer);
        },
        async terminate() {
            stop(new Error("Worker terminated"));
            await worker.terminate();
        },
    };
}
export function serve(handle, onMessage) {
    const port = parentPort;
    if (!port)
        throw new Error("serve runs only inside a worker thread");
    port.on("message", (message) => {
        if (!isCall(message)) {
            onMessage?.(message);
            return;
        }
        Promise.resolve()
            .then(() => handle(message.request))
            .then((result) => port.postMessage({ reply: message.call, result }), (error) => port.postMessage({
            reply: message.call,
            error: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? String(error.name) : "Error",
        }));
    });
}
