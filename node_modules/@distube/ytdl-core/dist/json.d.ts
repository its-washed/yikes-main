import type { Thumbnail } from "./info.ts";
export type Json = Readonly<Record<string, unknown>>;
export declare function isRecord(value: unknown): value is Json;
export declare function at(value: unknown, ...path: readonly (string | number)[]): unknown;
/** A finite number, or a numeric string as InnerTube sends sizes and bitrates. */
export declare function num(value: unknown): number | undefined;
export declare function str(value: unknown): string | undefined;
export declare function text(value: unknown): string | undefined;
export declare function list(value: unknown): readonly unknown[];
export declare function ytcfg(page: string): Json;
export declare function collect(value: unknown, key: string, found?: Json[]): Json[];
export declare function thumbnails(value: unknown): Thumbnail[];
export declare function parseAbbreviated(input: string | undefined): number | undefined;
export declare function parseClock(input: string | undefined): number | undefined;
