const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'webhook',
        description: 'Create a webhook',
        usage: ',webhook [name]'
    },
    aliases: ['createwebhook'],
    cooldown: 10,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageWebhooks')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Webhooks permission.')] });
        }

        const name = args.join(' ') || 'Yikes Webhook';

        try {
            const webhook = await message.channel.createWebhook({ name });
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Webhook Created',
                    fields: [
                        { name: 'Name', value: webhook.name, inline: true },
                        { name: 'URL', value: webhook.url, inline: false }
                    ]
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Could not create webhook.')] });
        }
    }
};
