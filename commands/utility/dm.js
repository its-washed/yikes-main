const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'dm', description: 'Send a DM to a user', usage: ',dm <@user|userId> <message>' },
    aliases: ['pm', 'message'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageServer)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Server` permission.')] });
        }

        const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
        const text = args.slice(1).join(' ').replace(/<@\d+>/g, '').trim();

        if (!target || !text) return message.reply({ embeds: [errorEmbed('Usage', ',dm <@user|userId> <message>')] });

        try {
            await target.send({ embeds: [{ color: 0x6c5ce7, description: text }] });
            return message.reply({ embeds: [successEmbed('DM Sent', `Message sent to **${target.tag}**.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', `Could not DM: ${e.message}`)] });
        }
    }
};
