const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'cardhelp', description: 'Card trading help', usage: ',cardhelp' },
    aliases: ['chelp2'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Card Trading Help', description: '`,claim` — Claim a card\n`,cards [@user]` — View cards\n`,cardinfo [id]` — Card info\n`,trade [@user] [id]` — Trade card\n`,deletecard [id]` — Delete card\n`,topcards` — Top collectors' })] });
    }
};
