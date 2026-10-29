const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { warn } = require('../../utils/context');

module.exports = {
    permission: "manage roles",
    data: { name: 'unhide', description: 'Unhide a channel from everyone', usage: ',unhide [channel]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        let channel = message.channel;
        if (args[0]) {
            const id = String(args[0]).replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(id) ||
                message.guild.channels.cache.filter(entry => entry.name.toLowerCase() === String(args[0]).toLowerCase() && entry.size === 1).first() ||
                null;
        }
        if (!channel) return warn(message, `No channel named \`${args[0]}\` found`);

        try {
            const everyone = message.guild.roles.everyone;
            const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
            const isHidden = overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel);
            if (!isHidden) {
                return warn(message, 'Channel is **not** hidden');
            }
            await channel.permissionOverwrites.edit(everyone, { ViewChannel: null }, { reason: `Channel unhidden by ${message.author}` });
            return message.react('✅').catch(() => {});
        } catch (err) {
            return warn(message, 'Failed to unhide this channel');
        }
    }
};
