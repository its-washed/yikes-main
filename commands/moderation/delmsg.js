const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'delmsg', description: 'Delete a message by ID', usage: ',delmsg <#channel> <messageId>' },
    aliases: ['deletemsg'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageServer)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Server` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const msgId = args.find(a => /^\d+$/.test(a) && a !== channel.id);
        if (!msgId) return message.reply({ embeds: [errorEmbed('Usage', ',delmsg #channel <messageId>')] });

        try {
            const targetMsg = await channel.messages.fetch(msgId);
            await targetMsg.delete();
            return message.reply({ embeds: [successEmbed('Deleted', `Message \`${msgId}\` deleted from ${channel}.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
