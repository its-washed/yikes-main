const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { warn } = require('../../utils/context');

module.exports = {
    permission: "manage roles",
    data: { name: 'hide', description: 'Hide a channel from everyone', usage: ',hide [channel]' },
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
        if (channel.type === 11 || channel.type === 12) return warn(message, "You can't hide threads");

        try {
            const everyone = message.guild.roles.everyone;
            const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
            if (overwrite && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
                return warn(message, 'Channel is **already** hidden');
            }
            await channel.permissionOverwrites.edit(everyone, { ViewChannel: false }, { reason: `Channel hidden by ${message.author}` });
            return message.react('✅').catch(() => {});
        } catch (err) {
            if (err && (err.status === 400 || err.code === 50070)) {
                return warn(message, "You can't hide a **Onboarding** channel");
            }
            return warn(message, 'Failed to hide this channel');
        }
    }
};
