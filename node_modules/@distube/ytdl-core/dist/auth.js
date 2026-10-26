// Header format follows yt-dlp `_base.py` `_generate_cookie_auth_headers`.
import { createHash } from "node:crypto";
import { BROWSER, YOUTUBE_ORIGIN } from "./clients.js";
import { registerSecret, YtdlError } from "./errors.js";
import { abortable, fetchText } from "./http.js";
import { str, ytcfg } from "./json.js";
function parseCookieHeader(header) {
    const cookies = new Map();
    for (const part of header.split(";")) {
        const eq = part.indexOf("=");
        if (eq <= 0)
            continue;
        cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
    return cookies;
}
// curl marks HttpOnly cookies with a `#HttpOnly_` prefix.
function netscapeToCookieHeader(text) {
    const cookies = new Map();
    for (const raw of text.split(/\r?\n/u)) {
        const line = raw.startsWith("#HttpOnly_") ? raw.slice("#HttpOnly_".length) : raw;
        if (line.startsWith("#") || line.trim() === "")
            continue;
        const [domain, , , , , name, value] = line.split("\t");
        if (domain === undefined || !name || value === undefined)
            continue;
        const host = domain.replace(/^\./u, "");
        if (host !== "youtube.com" && !host.endsWith(".youtube.com"))
            continue;
        cookies.set(name, value);
    }
    return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}
/** YouTube itself falls back to `__Secure-3PAPISID` when `SAPISID` is missing (yt-dlp#393). */
function sapisidOf(cookies) {
    return cookies.get("SAPISID") || cookies.get("__Secure-3PAPISID") || undefined;
}
export class CookieAuth {
    #cookie;
    #sids;
    #fetch;
    #session;
    constructor(options) {
        const text = typeof options.cookie === "string" ? options.cookie.trim() : options.cookie;
        const header = typeof text === "string" && text.includes("\t") ? netscapeToCookieHeader(text) : text;
        if (typeof header !== "string" || !sapisidOf(parseCookieHeader(header))) {
            throw new YtdlError("INVALID_ARGUMENT", "The cookie has no SAPISID or __Secure-3PAPISID value; it is signed out");
        }
        const cookies = parseCookieHeader(header);
        registerSecret(header);
        for (const value of cookies.values())
            registerSecret(value);
        this.#cookie = header;
        this.#sids = [
            ["SAPISIDHASH", sapisidOf(cookies)],
            ["SAPISID1PHASH", cookies.get("__Secure-1PAPISID")],
            ["SAPISID3PHASH", cookies.get("__Secure-3PAPISID")],
        ];
        this.#fetch = options.fetch;
    }
    async headers(origin, signal) {
        const session = await abortable(this.#loadSession(), signal);
        const headers = {
            Cookie: this.#cookie,
            Authorization: this.#authorization(session.userSessionId, origin),
            "X-Origin": origin,
            "X-Goog-AuthUser": session.sessionIndex,
        };
        if (session.delegatedSessionId)
            headers["X-Goog-PageId"] = session.delegatedSessionId;
        return headers;
    }
    async dataSyncId(signal) {
        return (await abortable(this.#loadSession(), signal)).dataSyncId;
    }
    #authorization(userSessionId, origin) {
        const timestamp = String(Math.round(Date.now() / 1000));
        const prefix = userSessionId ? `${userSessionId} ` : "";
        // YouTube hashes a user session ID first and adds the part name `u` as a suffix.
        const suffix = userSessionId ? "_u" : "";
        const authorizations = [];
        for (const [scheme, sid] of this.#sids) {
            if (!sid)
                continue;
            const hash = createHash("sha1").update(`${prefix}${timestamp} ${sid} ${origin}`).digest("hex");
            authorizations.push(`${scheme} ${timestamp}_${hash}${suffix}`);
        }
        return authorizations.join(" ");
    }
    #loadSession() {
        this.#session ??= this.#fetchSession().catch((error) => {
            this.#session = undefined;
            throw error;
        });
        return this.#session;
    }
    // The home page ytcfg carries `SESSION_INDEX` and `LOGGED_IN`, which an InnerTube `responseContext` lacks.
    async #fetchSession() {
        const page = await fetchText(this.#fetch, `${YOUTUBE_ORIGIN}/`, { headers: { Cookie: this.#cookie, ...BROWSER } }, "The signed-in YouTube home page");
        const config = ytcfg(page);
        if (config.LOGGED_IN === false) {
            throw new YtdlError("AUTH_FAILED", "YouTube treats the cookie as signed out; export a fresh one");
        }
        const field = (name) => str(config[name]) || undefined;
        const dataSyncId = field("DATASYNC_ID");
        if (dataSyncId)
            registerSecret(dataSyncId);
        // `DELEGATED||USER` on a secondary channel, `USER||` on the primary one.
        const [first, second] = (dataSyncId ?? "").split("||");
        const delegatedSessionId = field("DELEGATED_SESSION_ID") ?? (second ? first : undefined);
        const userSessionId = field("USER_SESSION_ID") ?? (second || first || undefined);
        return {
            dataSyncId,
            userSessionId,
            delegatedSessionId,
            sessionIndex: String(config.SESSION_INDEX ?? "0"),
        };
    }
}
