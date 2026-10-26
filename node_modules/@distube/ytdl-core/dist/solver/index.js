import { YOUTUBE_ORIGIN } from "../clients.js";
import { YtdlError } from "../errors.js";
import { abortable, fetchText, ignore } from "../http.js";
import { startWorker } from "../worker-rpc.js";
const CACHE_LIMIT = 4;
const cache = new Map();
const handles = new WeakMap();
let nextHandle = 0;
let solver;
function worker() {
    if (solver)
        return solver;
    const file = new URL(import.meta.url.endsWith(".ts") ? "./worker.ts" : "./worker.js", import.meta.url);
    const started = startWorker(file, {
        onStop: () => {
            if (solver !== started)
                return;
            solver = undefined;
            cache.clear();
        },
    });
    solver = started;
    return started;
}
const CALL_DEADLINE_MS = 10_000;
async function call(rpc, request) {
    const deadline = setTimeout(() => rpc.terminate().catch(ignore), CALL_DEADLINE_MS);
    try {
        return await rpc.call(request);
    }
    finally {
        clearTimeout(deadline);
    }
}
export async function loadPlayer({ fetch, playerId, signal }) {
    signal?.throwIfAborted();
    const id = playerId ?? (await discoverPlayerId(fetch, signal));
    let entry = cache.get(id);
    cache.delete(id);
    if (!entry) {
        const created = prepare(id, fetch);
        created.catch(() => cache.get(id) === created && cache.delete(id));
        entry = created;
    }
    cache.set(id, entry);
    for (const [oldId, old] of cache) {
        if (cache.size <= CACHE_LIMIT)
            break;
        cache.delete(oldId);
        old.then((player) => {
            const handle = handles.get(player);
            if (solver && handle !== undefined)
                call(solver, { kind: "drop", handle }).catch(ignore);
        }, ignore);
    }
    return abortable(entry, signal);
}
// YouTube rolls the player a few times a week.
const DISCOVERY_TTL_MS = 10 * 60 * 1000;
let discovery;
function discoverPlayerId(fetchFn, signal) {
    if (!discovery || Date.now() - discovery.at >= DISCOVERY_TTL_MS) {
        const id = fetchText(fetchFn, `${YOUTUBE_ORIGIN}/iframe_api`, {}, "YouTube iframe API")
            .then((text) => {
            const found = /player\\?\/([\da-f]{8})\\?\//u.exec(text)?.[1];
            if (!found)
                throw new Error("No player ID in the iframe API script");
            return found;
        })
            .catch((cause) => {
            throw new YtdlError("PLAYER_SOLVE_FAILED", "Could not find the current player version", { cause });
        });
        const entry = { id, at: Date.now() };
        discovery = entry;
        id.catch(() => {
            if (discovery === entry)
                discovery = undefined;
        });
    }
    return abortable(discovery.id, signal);
}
// The main player, as yt-dlp uses.
const playerUrl = (id) => `${YOUTUBE_ORIGIN}/s/player/${encodeURIComponent(id)}/player_ias.vflset/en_US/base.js`;
async function prepare(id, fetchFn) {
    const source = await fetchText(fetchFn, playerUrl(id), {}, `YouTube player ${id}`).catch((cause) => {
        throw new YtdlError("PLAYER_SOLVE_FAILED", `Could not load player ${id}`, { cause });
    });
    const timestamp = /signatureTimestamp:(\d+)/u.exec(source)?.[1];
    if (!timestamp)
        throw new YtdlError("PLAYER_SOLVE_FAILED", `No signature timestamp in player ${id}`);
    const rpc = worker();
    const handle = ++nextHandle;
    await call(rpc, { kind: "load", handle, source }).catch((cause) => {
        throw new YtdlError("PLAYER_SOLVE_FAILED", `Could not prepare player ${id}`, { cause });
    });
    const player = {
        id,
        signatureTimestamp: Number(timestamp),
        solve: (urls) => solveUrls(rpc, id, handle, urls),
    };
    handles.set(player, handle);
    return player;
}
function target(format) {
    const params = format.signatureCipher === undefined ? undefined : new URLSearchParams(format.signatureCipher);
    const raw = params ? params.get("url") : format.url;
    if (!raw || !URL.canParse(raw))
        throw new YtdlError("PLAYER_SOLVE_FAILED", "Format has no valid URL");
    const url = new URL(raw);
    const sig = params?.get("s") ?? undefined;
    // Manifest URLs carry their parameters as `/key/value` path segments.
    const segments = url.pathname.split("/");
    const pathN = url.searchParams.has("n") ? -1 : segments.indexOf("n") + 1;
    const n = url.searchParams.get("n") ?? (pathN > 0 ? segments[pathN] : undefined);
    return {
        url,
        segments,
        pathN,
        sigParam: params?.get("sp") ?? "signature",
        challenge: sig === undefined && n === undefined ? undefined : { sig, n },
    };
}
const challengeKey = ({ sig, n }) => JSON.stringify([sig ?? null, n ?? null]);
async function solveUrls(rpc, id, handle, formats) {
    const targets = formats.map(target);
    const unique = new Map();
    for (const { challenge } of targets)
        if (challenge)
            unique.set(challengeKey(challenge), challenge);
    let answers = new Map();
    if (unique.size > 0) {
        const challenges = [...unique.values()];
        const solved = (await call(rpc, { kind: "solve", handle, challenges }).catch((cause) => {
            throw new YtdlError("PLAYER_SOLVE_FAILED", `Could not solve URLs with player ${id}`, { cause });
        }));
        answers = new Map([...unique.keys()].map((key, index) => [key, solved[index] ?? {}]));
    }
    return targets.map(({ url, segments, pathN, sigParam, challenge }) => {
        const solved = challenge && answers.get(challengeKey(challenge));
        if (solved?.sig !== undefined)
            url.searchParams.set(sigParam, solved.sig);
        if (solved?.n !== undefined) {
            if (pathN > 0) {
                segments[pathN] = solved.n;
                url.pathname = segments.join("/");
            }
            else
                url.searchParams.set("n", solved.n);
        }
        return url.toString();
    });
}
