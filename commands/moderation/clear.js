const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, prefix } = require('../../utils/moderation');
const { applyDescriptions } = require('../../utils/helpers');

async function collect(channel, limit, check) {
    const found = [];
    let before;
    for (let page = 0; page < Math.ceil(limit / 100); page++) {
        const options = { limit: 100 };
        if (before) options.before = before;
        const batch = await channel.messages.fetch(options).catch(() => null);
        if (!batch || !batch.size) break;
        for (const entry of batch.values()) {
            if (entry.pinned) continue;
            if (check && !check(entry)) continue;
            found.push(entry);
        }
        const last = batch.last();
        if (!last) break;
        before = last.id;
        if (found.length >= limit) break;
    }
    return found.slice(0, limit);
}

async function purge(channel, limit, check) {
    const targets = await collect(channel, limit, check);
    if (!targets.length) return 0;
    const now = Date.now();
    const recent = targets.filter(entry => now - entry.createdTimestamp < 14 * 86400000);
    const old = targets.filter(entry => now - entry.createdTimestamp >= 14 * 86400000);
    if (recent.length) await channel.bulkDelete(recent, true).catch(() => {});
    for (const entry of old) await entry.delete().catch(() => {});
    return targets;
}

async function logBulkDelete(guild, deleted) {
    try {
        const { first } = require('../../utils/database');
        const { createEmbed, COLORS } = require('../../utils/embeds');
        const record = first('SELECT messages FROM logging WHERE guild_id = ?', guild.id);
        if (!record || !record.messages) return;
        const channel = guild.channels.cache.get(String(record.messages));
        if (!channel) return;
        const newest = deleted[0];
        if (!newest) return;
        const lines = deleted.map((entry, index) => `[${index + 1}] ${entry.author}: ${entry.content}`);
        const embed = createEmbed({
            color: COLORS.neutral,
            title: 'Bulk Message Delete',
            description: `\`${deleted.length}\` messages got deleted`,
            fields: [{ name: 'Channel', value: `<#${newest.channel.id}> (\`${newest.channel.id}\`)`, inline: false }],
            footer: { text: `ID: ${newest.id}` }
        });
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Message')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${guild.id}/${newest.channel.id}/${newest.id}`)
        );
        await channel.send({
            embeds: [embed],
            components: [row],
            files: [{ attachment: Buffer.from(lines.join('\n'), 'utf8'), name: 'messages.txt' }]
        }).catch(() => {});
    } catch (err) {
        return;
    }
}

async function runMessages(message, args, client) {
    const number = parseInt(args[0], 10);
    if (!Number.isFinite(number) || number <= 0) {
        return;
    }
    if (number > 100) {
        const { warn } = require('../../utils/context');
        return warn(message, 'You can only delete up to **100 messages** at once.');
    }

    const { warn, approve } = require('../../utils/context');
    let user = null;
    if (args[1]) {
        user = message.mentions.users.first();
        if (!user) {
            const id = String(args[1]).replace(/[<@!>]/g, '');
            if (/^\d{17,20}$/.test(id)) user = await client.users.fetch(id).catch(() => null);
        }
        if (!user) return warn(message, `No user called **${args[1]}** found`);
    }

    const channel = message.channel;
    const fetched = await channel.messages.fetch({ limit: Math.min(number + 1, 100) }).catch(() => null);
    if (!fetched) return;

    const targets = fetched
        .filter(entry => !entry.pinned && entry.id !== message.id && (!user || entry.author.id === user.id))
        .first(number);

    if (!targets.length) {
        return warn(message, 'No messages matched that filter');
    }

    await message.delete().catch(() => {});

    const now = Date.now();
    const recent = targets.filter(entry => now - entry.createdTimestamp < 14 * 86400000);
    const old = targets.filter(entry => now - entry.createdTimestamp >= 14 * 86400000);
    let totalDeleted = 0;

    if (recent.length) {
        const done = await channel.bulkDelete(recent, true).catch(() => null);
        totalDeleted += done ? done.size : 0;
    }
    for (const entry of old) {
        const ok = await entry.delete().catch(() => null);
        if (ok) totalDeleted++;
    }

    if (totalDeleted > 0) {
        await logBulkDelete(message.guild, targets);
        return approve(message, `Deleted \`${totalDeleted}\` message${totalDeleted === 1 ? '' : 's'} from ${channel}`);
    }
    return null;
}

async function grouped(message, args, client, check, limit = 300) {
    const deleted = await purge(message.channel, limit, check);
    if (deleted.length) await logBulkDelete(message.guild, deleted);
    await message.delete().catch(() => {});
    return null;
}

const INVITE_RE = /discord(?:\.com|app\.com|\.gg)\/(?:invite\/)?([a-zA-Z0-9\-]{2,32})/i;

module.exports = {
    permission: "manage messages",
    data: { name: 'clear', description: "Add/remove roles to/from a user", usage: ',clear <number> [user]' },
    aliases: ['purge', 'c'],
    cooldown: 10,
    subcommands: ['bots', 'contains', 'embeds', 'images', 'invites', 'links', 'mentions', 'messages'],
    subUsages: {
        messages: ',clear messages <number> [user]',
        contains: ',clear contains <word>',
        mentions: ',clear mentions [user]'
    },
    subs: {
        messages: {
            aliases: [],
            execute: (message, args, client) => runMessages(message, args, client)
        },
        links: {
            aliases: [],
            execute: (message, args, client) => grouped(message, args, client,
                entry => entry.content && (entry.content.startsWith('http://') || entry.content.startsWith('https://')))
        },
        images: {
            aliases: [],
            execute: (message, args, client) => grouped(message, args, client,
                entry => entry.attachments && entry.attachments.size > 0)
        },
        invites: {
            aliases: [],
            execute: (message, args, client) => grouped(message, args, client,
                entry => entry.content && INVITE_RE.test(entry.content))
        },
        bots: {
            aliases: [],
            execute: (message, args, client) => grouped(message, args, client,
                entry => Boolean(entry.author.bot), 100)
        },
        contains: {
            aliases: [],
            execute: (message, args, client) => {
                const word = args.join(' ').trim().toLowerCase();
                if (!word) return null;
                return grouped(message, args, client, entry => entry.content && entry.content.toLowerCase().includes(word));
            }
        },
        embeds: {
            aliases: [],
            execute: (message, args, client) => grouped(message, args, client,
                entry => entry.embeds && entry.embeds.length > 0)
        },
        mentions: {
            aliases: [],
            execute: (message, args, client) => {
                if (!args[0]) return grouped(message, args, client, entry => entry.mentions && entry.mentions.users.size > 0);
                const user = message.mentions.users.first();
                if (!user) return null;
                return grouped(message, args, client, entry => entry.mentions && entry.mentions.users.has(user.id));
            }
        }
    },

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;

        if (args[0] && /^\d+$/.test(args[0])) {
            return runMessages(message, args, client);
        }

        return require('../../utils/helpCard').sendCard(message, module.exports);
    }
};

applyDescriptions(module.exports, {
    "clear links": "Clear messages that contain links",
    "clear images": "Clear messages that have attachments",
    "clear messages": "Delete multiple messages at once (up to 100)",
    "clear bots": "Clear messages sent by bots",
    "clear invites": "Clear messages that contain discord invite links",
    "clear contains": "Clear messages that contain a certain word",
    "clear embeds": "Clear messages that have embeds",
    "clear mentions": "Clear message that have certain mentions"
});
