const { warn } = require('../../utils/context');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'quickpoll', description: 'Create a quick poll', usage: ',quickpoll <question>' },
    aliases: ['poll', 'qp'],
    cooldown: 5,

    async execute(message, args) {
        const question = args.join(' ').trim();
        if (!question) return warn(message, 'Usage: `quickpoll <question>`');

        const sent = await message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                description: `**Question:** ${question}`,
                author: { name: String(message.author), icon_url: message.author.displayAvatarURL({ size: 256 }) }
            })]
        });

        await sent.react('👍').catch(() => {});
        await sent.react('👎').catch(() => {});
        return sent;
    }
};
