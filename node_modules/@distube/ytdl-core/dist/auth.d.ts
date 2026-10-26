interface CookieAuthOptions {
    readonly cookie: string;
    readonly fetch: typeof fetch;
}
export declare class CookieAuth {
    #private;
    constructor(options: CookieAuthOptions);
    headers(origin: string, signal?: AbortSignal): Promise<Readonly<Record<string, string>>>;
    dataSyncId(signal?: AbortSignal): Promise<string | undefined>;
}
export {};
