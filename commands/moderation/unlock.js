const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'unlock', description: 'Unlock a channel', usage: ',unlock [#channel]' },
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true }, { reason: `Unlocked by ${message.author.tag}` });
        return message.reply({ embeds: [successEmbed('Unlocked', `Unlocked ${channel}.`)] });
    }
};
