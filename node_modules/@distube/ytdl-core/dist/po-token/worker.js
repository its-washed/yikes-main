import { parentPort } from "node:worker_threads";
import { BotGuardClient } from "bgutils-js/botguard";
import { buildURL, getHeaders, parseLooseJSON, USER_AGENT } from "bgutils-js/utils";
import { WebPoMinter } from "bgutils-js/webpo";
import { JSDOM, VirtualConsole } from "jsdom";
import { at, str, ytcfg } from "../json.js";
import { serve } from "../worker-rpc.js";
// YouTube web player's WAA request key.
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const HOMEPAGE = "https://www.youtube.com/";
// yt-dlp's accept-all consent cookie; without it EU hosts are redirected to consent.youtube.com.
const CONSENT_COOKIE = "SOCS=CAI";
const INTERPRETER_DOMAINS = ["google.com", "youtube.com"];
if (!parentPort)
    throw new Error("po-token/worker runs only as a worker thread");
const port = parentPort;
// BgUtils and the BotGuard VM read these from globalThis; this thread exists so the host's stay untouched.
const dom = new JSDOM('<!DOCTYPE html><html lang="en"><head><title></title></head><body></body></html>', {
    url: "https://www.youtube.com/",
    referrer: "https://www.youtube.com/",
    virtualConsole: new VirtualConsole(),
});
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    origin: dom.window.origin,
});
// jsdom sets its user agent only through `resources`, which also loads subresources outside the proxied fetch.
Object.defineProperty(dom.window.Navigator.prototype, "userAgent", { get: () => USER_AGENT });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const fetches = new Map();
let nextFetchId = 0;
// Functions cannot cross the thread boundary, so the host runs every request with its `fetch`.
const proxiedFetch = ((url, init) => {
    const id = nextFetchId++;
    const headers = {};
    new Headers(init?.headers).forEach((value, key) => {
        headers[key] = value;
    });
    const request = {
        type: "fetch",
        id,
        url: String(url),
        method: init?.method ?? "GET",
        headers,
        body: typeof init?.body === "string" ? init.body : undefined,
    };
    port.postMessage(request);
    return new Promise((resolve, reject) => fetches.set(id, { resolve, reject }));
});
async function fetchText(url, name, headers = {}) {
    const response = await proxiedFetch(url, { headers: { "User-Agent": USER_AGENT, ...headers } });
    if (!response.ok)
        throw new Error(`${name} answered ${response.status}`);
    return response.text();
}
async function createMinter() {
    const page = await fetchText(HOMEPAGE, "The YouTube home page", { Cookie: CONSENT_COOKIE });
    const config = ytcfg(page);
    const atN = /window\.ytAtN\((\{.*?\})\)/su.exec(page)?.[1];
    const challenge = atN === undefined ? undefined : at(parseLooseJSON(atN), "R", "bgChallenge");
    const interpreterUrl = str(at(challenge, "interpreterUrl", "privateDoNotAccessOrElseTrustedResourceUrlWrappedValue"));
    const program = str(at(challenge, "program"));
    const globalName = str(at(challenge, "globalName"));
    if (Object.keys(config).length === 0 || !interpreterUrl || !program || !globalName) {
        throw new Error("The YouTube home page carries no BotGuard challenge");
    }
    // YouTube accepts WEB and MWEB tokens only from a VM that read the `yt.config_` of the page serving its challenge.
    const yt = { config_: config };
    Object.assign(globalThis, { yt });
    Object.assign(dom.window, { yt });
    const interpreter = new URL(interpreterUrl, HOMEPAGE);
    const trusted = INTERPRETER_DOMAINS.some((domain) => interpreter.hostname === domain || interpreter.hostname.endsWith(`.${domain}`));
    if (interpreter.protocol !== "https:" || !trusted) {
        throw new Error(`The BotGuard interpreter must come from Google over HTTPS, not ${interpreter.origin}`);
    }
    new Function(await fetchText(interpreter.href, "The BotGuard interpreter"))();
    const client = await BotGuardClient.create({
        program,
        globalName,
        globalObject: globalThis,
    });
    const webPoSignalOutput = [];
    const botguardResponse = await client.snapshot({ webPoSignalOutput });
    const response = await proxiedFetch(buildURL("GenerateIT", true), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify([REQUEST_KEY, botguardResponse]),
    });
    if (!response.ok)
        throw new Error(`GenerateIT answered ${response.status}`);
    const json = await response.json();
    const [integrityToken, estimatedTtlSecs, mintRefreshThreshold] = Array.isArray(json) ? json : [];
    if (typeof integrityToken !== "string" || typeof estimatedTtlSecs !== "number") {
        throw new Error("GenerateIT returned no integrity token");
    }
    const threshold = typeof mintRefreshThreshold === "number" ? mintRefreshThreshold : 0;
    const minter = await WebPoMinter.create({ integrityToken, estimatedTtlSecs }, webPoSignalOutput);
    // YouTube's player replaces the integrity token once less than `mintRefreshThreshold` seconds remain.
    return { minter, refreshAt: Date.now() + (estimatedTtlSecs - threshold) * 1000 };
}
let current;
let refreshAt = 0;
function getMinter() {
    if (!current || Date.now() >= refreshAt) {
        refreshAt = Number.POSITIVE_INFINITY;
        const next = createMinter().then((created) => {
            refreshAt = created.refreshAt;
            return created.minter;
        });
        next.catch(() => {
            if (current === next)
                current = undefined;
        });
        current = next;
    }
    return current;
}
async function mint(identifier) {
    const minter = await getMinter();
    return identifier === undefined ? undefined : minter.mintAsWebsafeString(identifier);
}
serve((contentBinding) => mint(typeof contentBinding === "string" ? contentBinding : undefined), (message) => {
    const reply = message;
    const pending = fetches.get(reply.id);
    fetches.delete(reply.id);
    if ("error" in reply)
        pending?.reject(Object.assign(new Error(reply.error), { name: reply.name }));
    else
        pending?.resolve(new Response(reply.body, { status: reply.status }));
});
