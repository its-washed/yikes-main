const { warn } = require('../../utils/context');
const { COLORS, EMOJIS } = require('../../utils/styles');

module.exports = {
    data: { name: 'trueorfalse', description: 'Check if a statement is true or false', usage: ',trueorfalse (reply to a message)', params: [] },
    aliases: ['tof'],
    cooldown: 5,

    async execute(message) {
        if (!message.reference) {
            return warn(message, 'You have to reply to a message to use this command');
        }
        const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (!replied || !replied.content) {
            return warn(message, "You can't check if an empty message is true or false");
        }
        const embed = {
            color: COLORS.NEUTRAL,
            author: {
                name: message.author.username,
                icon_url: message.author.displayAvatarURL({ size: 256 })
            },
            fields: [
                { name: 'Statement', value: '```' + replied.content.slice(0, 1000) + '```', inline: false },
                { name: 'Author', value: `${replied.author}`, inline: true },
                { name: 'Is it true?', value: Math.random() < 0.5 ? `${EMOJIS.APPROVE}` : `${EMOJIS.DENY}`, inline: true }
            ]
        };
        return message.reply({ embeds: [embed] });
    }
};
