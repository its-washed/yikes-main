const { warn } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { AttachmentBuilder } = require('discord.js');

const FILTERS = {
    jail: { endpoint: 'canvas/overlay/jail', file: 'jail.png' },
    gay: { endpoint: 'canvas/overlay/gay', file: 'gay.png' },
    passed: { endpoint: 'canvas/overlay/passed', file: 'passed.png' },
    triggered: { endpoint: 'canvas/overlay/triggered', file: 'triggered.png' },
    wasted: { endpoint: 'canvas/overlay/wasted', file: 'wasted.png' },
    blur: { endpoint: 'canvas/misc/jpg', file: 'blur.png' }
};

function resolveImageUrl(message, args) {
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned.displayAvatarURL({ size: 512 });
    if (args[0]) {
        const raw = String(args[0]);
        if (/^https?:\/\//i.test(raw)) return raw;
        const id = raw.replace(/[<@!>]/g, '');
        if (/^\d{17,20}$/.test(id)) {
            const member = message.guild.members.cache.get(id);
            if (member) return member.user.displayAvatarURL({ size: 512 });
        }
    }
    if (message.attachments.first()) return message.attachments.first().url;
    return null;
}

async function resolveTargetUrl(message, args) {
    const direct = resolveImageUrl(message, args);
    if (direct) return direct;
    if (message.reference) {
        const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (replied) {
            const attachment = replied.attachments.first();
            if (attachment) return attachment.url;
            const match = String(replied.content || '').match(/https?:\/\/\S+/);
            if (match) return match[0];
            if (replied.stickers.first()) return replied.stickers.first().url;
        }
        return { error: "Replied message doesn't have an attachment" };
    }
    return null;
}

async function applyFilter(message, filterKey, args) {
    const filter = FILTERS[filterKey];
    const resolved = await resolveTargetUrl(message, args);
    if (resolved && resolved.error) return warn(message, resolved.error);
    if (!resolved) {
        return warn(message, 'You must provide an image URL, mention a user, attach an image, or reply to a message with an attachment');
    }

    const url = new URL(`https://some-random-api.com/${filter.endpoint}`);
    url.searchParams.set('avatar', resolved);

    let bytes = null;
    try {
        const res = await fetch(url.toString());
        if (res.ok) bytes = Buffer.from(await res.arrayBuffer());
    } catch (err) {
        bytes = null;
    }
    if (!bytes) {
        return warn(message, `Failed to apply the ${filterKey} filter. Please try again later...`);
    }
    return message.reply({ files: [new AttachmentBuilder(bytes, { name: filter.file })] });
}

function makeSub(name, description) {
    return {
        aliases: [],
        data: { name: `media ${name}`, description, usage: `media ${name} [user|url|attachment|reply]` },
        async execute(message, args, client, config) {
            return applyFilter(message, name, args);
        }
    };
}

module.exports = {
    data: { name: 'media', description: 'Media commands', usage: ',media <jail|gay|passed|triggered|wasted|blur>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['jail', 'gay', 'passed', 'triggered', 'wasted', 'blur'],
    subUsages: {
        jail: ',media jail [user|url]',
        gay: ',media gay [user|url]',
        passed: ',media passed [user|url]',
        triggered: ',media triggered [user|url]',
        wasted: ',media wasted [user|url]',
        blur: ',media blur [user|url]'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        jail: makeSub('jail', 'Apply a jail filter onto your photo'),
        gay: makeSub('gay', 'Apply a gay filter onto your photo'),
        passed: makeSub('passed', 'Apply a passed filter onto your photo'),
        triggered: makeSub('triggered', 'Apply a triggered filter onto your photo'),
        wasted: makeSub('wasted', 'Apply a wasted filter onto your photo'),
        blur: makeSub('blur', 'Apply a blur filter onto your photo')
    }
};
