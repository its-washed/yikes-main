const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'webhook',
        description: 'Create and manage webhooks',
        usage: ',webhook [create|list|delete|send] ...'
    },
    aliases: ['wh'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Webhooks` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'list') {
            const webhooks = await message.guild.fetchWebhooks();
            if (webhooks.size === 0) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Webhooks', description: 'No webhooks in this server.' })] });
            }

            const list = webhooks.map(wh => `**${wh.name}** — ${wh.channel} (ID: \`${wh.id}\`)`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Webhooks (${webhooks.size})`, description: list })] });
        }

        if (action === 'create') {
            const name = args.slice(1).join(' ') || 'Yikes Webhook';
            try {
                const webhook = await message.channel.createWebhook({ name });
                return message.reply({ embeds: [successEmbed('Webhook Created', `**${webhook.name}** created in ${webhook.channel}\nURL: <${webhook.url}>`)] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'delete') {
            const id = args[1];
            if (!id) return message.reply({ embeds: [errorEmbed('Missing ID', 'Provide the webhook ID.')] });

            try {
                const webhooks = await message.guild.fetchWebhooks();
                const webhook = webhooks.get(id);
                if (!webhook) return message.reply({ embeds: [errorEmbed('Not Found', 'Webhook not found.')] });

                await webhook.delete();
                return message.reply({ embeds: [successEmbed('Webhook Deleted', `**${webhook.name}** has been deleted.`)] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'send') {
            const id = args[1];
            const content = args.slice(2).join(' ');
            if (!id || !content) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,webhook send [id] [message]')] });

            try {
                const webhooks = await message.guild.fetchWebhooks();
                const webhook = webhooks.get(id);
                if (!webhook) return message.reply({ embeds: [errorEmbed('Not Found', 'Webhook not found.')] });

                await webhook.send({ content, username: 'Yikes' });
                return message.reply({ embeds: [successEmbed('Sent', 'Message sent via webhook.')] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `create`, `list`, `delete`, `send`')] });
    }
};
