const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'awkward', description: 'Awkward moment', usage: ',awkward' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Awkward...', description: '*crickets* 🦗' })] });
    }
};
