export interface SignedUrl {
    readonly url?: string | undefined;
    readonly signatureCipher?: string | undefined;
}
export interface PreparedPlayer {
    readonly id: string;
    readonly signatureTimestamp: number;
    solve(urls: readonly SignedUrl[]): Promise<string[]>;
}
interface LoadPlayerOptions {
    readonly fetch: typeof fetch;
    readonly playerId?: string | undefined;
    readonly signal?: AbortSignal | undefined;
}
export declare function loadPlayer({ fetch, playerId, signal }: LoadPlayerOptions): Promise<PreparedPlayer>;
export {};
