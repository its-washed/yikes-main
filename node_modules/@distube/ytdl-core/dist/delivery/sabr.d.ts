import type { Session } from "./session.ts";
export declare function readSabr(session: Session, start: number, last: number, total: number | undefined, startTimeMs: number | undefined, signal: AbortSignal): AsyncGenerator<Uint8Array, void, undefined>;
