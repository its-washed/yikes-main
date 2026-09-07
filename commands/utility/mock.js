const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'mock', description: 'Send a message as another user via webhook', usage: ',mock @user <message>' },
    aliases: ['impersonate', 'webhook'],
    cooldown: 5,
    async execute(message, args) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const target = message.mentions.members.first();
        const text = args.slice(1).join(' ').replace(/<@\d+>/g, '').trim();
        if (!target || !text) return message.reply({ embeds: [errorEmbed('Usage', ',mock @user <message>')] });

        try {
            await message.delete().catch(() => {});

            const webhook = await message.channel.createWebhook({
                name: target.user.username,
                avatar: target.user.displayAvatarURL({ dynamic: true })
            });

            await webhook.send({
                content: text,
                username: target.user.username,
                avatarURL: target.user.displayAvatarURL({ dynamic: true })
            });

            await webhook.delete().catch(() => {});
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', `Could not create webhook: ${e.message}`)] });
        }
    }
};
