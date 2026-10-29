const { imageFor } = require('../../utils/roleplay');
const { createEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
    data: { name: 'cry', description: 'Start crying', usage: ',cry' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        const image = await imageFor('cry');
        return message.reply({
            embeds: [createEmbed({
                color: COLORS.neutral,
                timestamp: false,
                description: `**${message.author.username}** cries`,
                image: image ? { url: image } : undefined
            })]
        });
    }
};
