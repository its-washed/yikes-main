const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'emojicount', description: 'Show emoji count', usage: ',emojicount' },
    aliases: ['ec', 'emojis'],
    cooldown: 5,
    async execute(message) {
        const emojis = message.guild.emojis.cache;
        const staticE = emojis.filter(e => !e.animated).size;
        const animated = emojis.filter(e => e.animated).size;
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7, title: 'Emoji Count',
                fields: [
                    { name: 'Total', value: `${emojis.size}`, inline: true },
                    { name: 'Static', value: `${staticE}`, inline: true },
                    { name: 'Animated', value: `${animated}`, inline: true }
                ]
            })]
        });
    }
};
