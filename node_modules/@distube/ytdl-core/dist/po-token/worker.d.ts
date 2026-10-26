export type FetchReply = {
    readonly type: "fetched";
    readonly id: number;
    readonly status: number;
    readonly body: ArrayBuffer;
} | {
    readonly type: "fetched";
    readonly id: number;
    readonly error: string;
    readonly name: string;
};
export type FetchRequest = {
    readonly type: "fetch";
    readonly id: number;
    readonly url: string;
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: string | undefined;
};
