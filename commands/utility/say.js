const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');
const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'say', description: "Send a message through the bot", usage: ',say [#channel] <message>' },
    aliases: [],
    cooldown: 3,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const text = args.join(' ').replace(/<#\d+>/g, '').trim();
        if (!text) return message.reply({ embeds: [errorEmbed('No Message', 'Usage: ,say #channel <message>')] });

        if (channel.permissionsFor && !channel.permissionsFor(message.author).sendMessages) {
            return warn(message, `You don't have permission to send messages in ${channel}`);
        }
        if (text.length > 2000) {
            return warn(message, "You can't send messages over **2000 characters**");
        }

        const attachment = message.attachments.first();
        await channel.send(attachment ? { content: text, files: [{ attachment: attachment.url, name: attachment.name }] } : { content: text }).catch(() => {});
        if (channel.id !== message.channel.id) {
            const reply = await message.reply({ embeds: [createEmbed({ color: 0x39ffb8, description: `Sent to ${channel}` })] });
            setTimeout(() => reply.delete().catch(() => {}), 3000);
        }
    }
};
