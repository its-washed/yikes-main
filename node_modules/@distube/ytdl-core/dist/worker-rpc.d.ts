import { type Transferable } from "node:worker_threads";
export interface WorkerRpc {
    call(request: unknown): Promise<unknown>;
    post(message: unknown, transfer?: readonly Transferable[]): void;
    terminate(): Promise<void>;
}
interface WorkerEvents {
    readonly onMessage?: (message: unknown) => void;
    readonly onStop?: () => void;
}
export declare function startWorker(file: URL, events?: WorkerEvents): WorkerRpc;
export declare function serve(handle: (request: unknown) => unknown, onMessage?: (message: unknown) => void): void;
export {};
