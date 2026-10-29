const { createCanvas, loadImage } = require('@napi-rs/canvas');

const emojiPattern = /<(a?):(\w+):(\d+)>/g;
const buckets = new Map();

function parseEmoji(token) {
    const match = /<(a?):(\w+):(\d+)>/.exec(String(token || ''));
    if (!match) return null;
    return { animated: Boolean(match[1]), name: match[2], id: match[3] };
}

function emojiUrl(emoji) {
    return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
}

async function fetchBytes(url) {
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
}

async function resizePng(buffer, size) {
    const image = await loadImage(buffer);
    const canvas = createCanvas(size, size);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, size, size);
    return canvas.toBuffer('image/png');
}

async function svgToPng(buffer) {
    const image = await loadImage(buffer);
    const size = 128;
    const canvas = createCanvas(size, size);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, size, size);
    return canvas.toBuffer('image/png');
}

function checkEmojiBucket(guildId) {
    const now = Date.now();
    const list = (buckets.get(guildId) || []).filter(time => now - time < 3600000);
    list.push(now);
    buckets.set(guildId, list);
    return list.length <= 29;
}

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
        let value = i;
        for (let j = 0; j < 8; j++) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[i] = value;
    }
    return table;
})();

function crc32(buffer) {
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
        crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
}

function buildZip(files) {
    const chunks = [];
    const central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2))) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    for (const file of files) {
        const name = Buffer.from(file.name, 'utf8');
        const data = file.data;
        const crc = crc32(data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0, 6);
        local.writeUInt16LE(0, 8);
        local.writeUInt16LE(dosTime, 10);
        local.writeUInt16LE(dosDate, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        chunks.push(local, name, data);

        const header = Buffer.alloc(46);
        header.writeUInt32LE(0x02014b50, 0);
        header.writeUInt16LE(20, 4);
        header.writeUInt16LE(20, 6);
        header.writeUInt16LE(0, 8);
        header.writeUInt16LE(0, 10);
        header.writeUInt16LE(dosTime, 12);
        header.writeUInt16LE(dosDate, 14);
        header.writeUInt32LE(crc, 16);
        header.writeUInt32LE(data.length, 20);
        header.writeUInt32LE(data.length, 24);
        header.writeUInt16LE(name.length, 28);
        header.writeUInt32LE(offset, 42);
        central.push(header, name);

        offset += local.length + name.length + data.length;
    }

    const centralBuffer = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralBuffer.length, 12);
    end.writeUInt32LE(offset, 16);

    return Buffer.concat([...chunks, centralBuffer, end]);
}

module.exports = { parseEmoji, emojiUrl, fetchBytes, resizePng, svgToPng, checkEmojiBucket, buildZip };
