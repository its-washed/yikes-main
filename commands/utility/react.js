const { PermissionFlagsBits, parseEmoji } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');

async function resolveTargetMessage(message, input) {
    const link = /(?:https?:\/\/)?(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/.exec(input || '');
    try {
        if (link) {
            if (link[1] !== message.guild.id) return { error: 'That message is in another server.' };
            const channel = message.guild.channels.cache.get(link[2]);
            if (!channel || !channel.messages) return { error: 'Could not find this message. I do not have access to this channel.' };
            return { msg: await channel.messages.fetch(link[3]) };
        }
        if (/^\d+$/.test(input)) {
            return { msg: await message.channel.messages.fetch(input) };
        }
    } catch (err) {
        return { error: 'The message could not be found or has been deleted.' };
    }
    return { error: 'This is **not** a message id or a message link' };
}

function resolveEmoji(guild, token) {
    const custom = parseEmoji(token);
    if (custom && custom.id) {
        const found = guild.emojis.cache.get(custom.id) || guild.emojis.cache.find(e => e.name === custom.name);
        if (found) return `<:${found.name}:${found.id}>`;
        return null;
    }
    const bare = token.replace(/^:+|:+$/g, '');
    const guildEmoji = guild.emojis.cache.find(e => e.name === bare);
    if (guildEmoji) return `<:${guildEmoji.name}:${guildEmoji.id}>`;
    if (token.includes(':')) return null;
    return token;
}

module.exports = {
    permission: "manage guild",
    data: { name: 'react', description: 'Add a reaction to a message', usage: ',react .../channels/... :f_thumbsup:', params: ['message', 'emoji'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        if (!args[0] || !args[1]) return warn(message, 'Usage: `react .../channels/... :f_thumbsup:`');

        const resolved = await resolveTargetMessage(message, args[0]);
        if (resolved.error) return warn(message, resolved.error);
        const target = resolved.msg;

        const emoji = resolveEmoji(message.guild, args[1]);
        if (!emoji) return warn(message, 'An error occurred while parsing the emoji.');

        try {
            await target.react(emoji);
        } catch (err) {
            if (err.code === 10008) return warn(message, 'The message could not be found or has been deleted.');
            return warn(message, `Could not add the reaction. Error: ${err.message}`);
        }
        return approve(message, `Added ${emoji} to [\`${target.id}\`](${target.url})`);
    }
};
