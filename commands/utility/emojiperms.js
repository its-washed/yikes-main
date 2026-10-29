const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');

function resolveChannel(message, args) {
    const raw = String(args.join(' ') || '').trim();
    if (!raw) return message.channel;
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find((c) => c.name === raw) || null;
}

async function togglePerms(message, args, permKey, label) {
    if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
    if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
    const member = message.mentions.members.first();
    if (!member) return warn(message, `You must mention a member\n> Usage: \`${label} <member> [channel]\``);
    const rest = args.filter((a) => !a.includes(member.id));
    const channel = resolveChannel(message, rest) || message.channel;
    if (!channel || !channel.permissionsFor) return warn(message, 'Invalid channel');

    const current = channel.permissionsFor(member).has(permKey);
    try {
        await channel.permissionOverwrites.edit(member, { [permKey]: !current },
            { reason: `${label} ${!current ? 'granted' : 'removed'} by ${message.author.tag}` });
    } catch (err) {
        return warn(message, `Failed to update permissions in ${channel}\n\`\`\`${err.message}\`\`\``);
    }
    if (current) return approve(message, `Removed ${label} from ${member} in ${channel}`);
    return approve(message, `Added ${label} to ${member} in ${channel}`);
}

module.exports = {
    permission: "manage messages",
    data: { name: 'emojiperms', description: 'Give a member permissions to use emojis in a channel', usage: ',emojiperms its_washed', params: ['[channel]'] },
    aliases: [],
    cooldown: 5,
    execute: async (message, args) => togglePerms(message, args, 'UseExternalEmojis', 'emoji perms')
};
