const { imageFor } = require('../../utils/roleplay');
const { createEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
    data: { name: 'laugh', description: 'Start laughing', usage: ',laugh' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        const image = await imageFor('laugh');
        return message.reply({
            embeds: [createEmbed({
                color: COLORS.neutral,
                timestamp: false,
                description: `**${message.author.username}** laughs`,
                image: image ? { url: image } : undefined
            })]
        });
    }
};
