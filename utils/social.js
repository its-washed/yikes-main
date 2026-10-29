function rapidKey() {
    return process.env.RAPIDAPI || process.env.RAPID_API_KEY || '';
}

function rapidUrl(base, params) {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params || {})) {
        url.searchParams.set(key, String(value));
    }
    const key = rapidKey();
    if (key) url.searchParams.set('rapidapi-key', key);
    return url.toString();
}

function rapidHeaders() {
    const key = rapidKey();
    return key ? { 'X-RapidAPI-Key': key, 'x-rapidapi-key': key } : {};
}

async function getJson(url, headers) {
    try {
        const res = await fetch(url, { headers: headers || {} });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        return null;
    }
}

async function getBytes(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
    } catch (err) {
        return null;
    }
}

module.exports = { rapidKey, rapidUrl, rapidHeaders, getJson, getBytes };
