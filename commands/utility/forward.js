const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');

module.exports = {
    permission: "manage messages",
    data: { name: 'forward', description: 'Forward a message to a channel', usage: ',forward #channel', params: ['channel'] },
    aliases: ['fw'],
    cooldown: 5,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        const channel = message.mentions.channels.first();
        if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,forward #channel`');
        if (!message.reference) return warn(message, 'Please reply to a valid message to forward it');

        let target = message.reference.cachedMessage;
        if (!target) {
            try {
                target = await message.channel.messages.fetch(message.reference.messageId);
            } catch (err) {
                return warn(message, 'Please reply to a valid message to forward it');
            }
        }
        if (!target) return warn(message, 'Please reply to a valid message to forward it');

        await approve(message, `Forwarded message to ${channel}`);
        try {
            if (typeof target.forward === 'function') {
                return await target.forward(channel);
            }
        } catch (err) {}

        try {
            return await channel.send({
                content: target.content || undefined,
                embeds: target.embeds,
                files: target.attachments.map((attachment) => attachment.url)
            });
        } catch (err) {
            return warn(message, 'Failed to forward the message');
        }
    }
};
