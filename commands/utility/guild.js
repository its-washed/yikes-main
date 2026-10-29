const { PermissionFlagsBits } = require('discord.js');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

async function resolveGuild(message, args) {
    const raw = String(args.join(' ') || '').trim();
    if (!raw) return { guild: message.guild, embed: null };
    const code = raw.split('/').pop();
    if (!/^[a-zA-Z0-9-_]+$/.test(code)) return { guild: null, error: 'The invite code contains invalid characters.' };
    try {
        const invite = await message.client.fetchInvite(code).catch(() => null);
        if (invite && invite.guild) return { guild: invite.guild, embed: null };
    } catch (err) {}
    if (/^\d{17,20}$/.test(code)) {
        const guild = message.client.guilds.cache.get(code);
        if (guild) return { guild, embed: null };
    }
    return { guild: null, error: 'Bot is not in this **server** or the **invite** is invalid' };
}

async function asset(message, args, kind) {
    const resolved = await resolveGuild(message, args);
    if (resolved.error) return warn(message, resolved.error);
    const guild = resolved.guild;
    const url = guild.iconURL?.({ size: 1024 }) || guild.bannerURL?.({ size: 1024 }) || guild.splashURL?.({ size: 1024 }) || null;
    const getter = kind === 'icon'
        ? (guild.iconURL ? guild.iconURL({ size: 1024 }) : null)
        : kind === 'banner'
            ? (guild.bannerURL ? guild.bannerURL({ size: 1024 }) : null)
            : (guild.splashURL ? guild.splashURL({ size: 1024 }) : null);
    const name = guild.name || guild.toString();
    if (!getter) {
        const label = kind === 'icon' ? 'icon' : kind === 'banner' ? 'banner' : 'splash background';
        return warn(message, `This server has no ${label}`);
    }
    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `${name}'s ${kind === 'icon' ? 'icon' : kind}`,
            url: getter,
            image: { url: getter }
        }]
    });
}

module.exports = {
    data: { name: 'guild', description: 'View assets from your a given guild', usage: ',guild <splash|banner|icon>' },
    aliases: ['server'],
    cooldown: 5,
    subcommands: ['splash', 'banner', 'icon'],
    subUsages: {
        splash: ',guild splash /evelina',
        banner: ',guild banner /evelina',
        icon: ',guild icon /evelina'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        splash: {
            aliases: [],
            data: { name: 'guild splash', description: 'Returns server splash background', usage: ',guild splash /evelina' },
            execute: async (message, args) => asset(message, args, 'splash')
        },
        banner: {
            aliases: [],
            data: { name: 'guild banner', description: 'Returns server banner', usage: ',guild banner /evelina' },
            execute: async (message, args) => asset(message, args, 'banner')
        },
        icon: {
            aliases: [],
            data: { name: 'guild icon', description: 'Returns server icon', usage: ',guild icon /evelina' },
            execute: async (message, args) => asset(message, args, 'icon')
        }
    }
};
