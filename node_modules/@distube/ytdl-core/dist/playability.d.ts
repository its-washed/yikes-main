import type { YtdlErrorCode } from "./errors.ts";
import { type Json } from "./json.ts";
type Playability = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly code: YtdlErrorCode;
    readonly reason: string;
    readonly startTime?: Date;
    readonly availableCountries?: readonly string[];
};
export declare function availableCountries(player: unknown): readonly string[] | undefined;
export declare function classifyPlayability(player: Json): Playability;
export declare function prerollEnd(player: Json, answeredAt: number): number;
export {};
