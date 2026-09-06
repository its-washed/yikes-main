const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'cry', description: 'Cry', usage: ',cry' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x3b82f6, title: 'Cry!', description: `${message.author} cries... 😢` })] });
    }
};
