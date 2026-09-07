const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'say', description: 'Make the bot say something in a channel', usage: ',say [#channel] <message>' },
    aliases: ['echo'],
    cooldown: 3,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const text = args.join(' ').replace(/<#\d+>/g, '').trim();
        if (!text) return message.reply({ embeds: [errorEmbed('No Message', 'Usage: ,say #channel <message>')] });

        await channel.send({ content: text }).catch(() => {});
        if (channel.id !== message.channel.id) {
            const reply = await message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `Sent to ${channel}` })] });
            setTimeout(() => reply.delete().catch(() => {}), 3000);
        }
    }
};
