const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'smile', description: 'Smile', usage: ',smile' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Smile!', description: `${message.author} smiles! 😄` })] });
    }
};
