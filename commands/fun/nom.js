const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'nom', description: 'Nom someone', usage: ',nom [@user]' },
    aliases: ['eat'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,nom [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Nom!', description: `${message.author} noms ${target}! 😋` })] });
    }
};
