/** The 11-character video ID of a bare ID or a YouTube watch, short, embed, live or `youtu.be` URL. */
export declare function parseVideoId(input: string): string | undefined;
export type VideoTarget = {
    readonly id: string;
} | {
    readonly channelLive: string;
};
export declare function getVideoTarget(input: string): VideoTarget;
/**
 * The playlist ID of a bare ID or a YouTube URL's `list` parameter; `undefined` for account lists such as `WL`, for
 * mixes, whose IDs start with `RD`, and for channels. YouTube Music's curated lists, which start with `RDCLAK5uy_`,
 * are playlists.
 */
export declare function parsePlaylistId(input: string): string | undefined;
export type PlaylistTarget = {
    readonly id: string;
} | {
    readonly channel: string;
};
export declare const uploads: (channelId: string) => string;
export declare function getPlaylistTarget(input: string): PlaylistTarget;
