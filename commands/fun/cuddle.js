const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'cuddle', description: 'Cuddle someone', usage: ',cuddle [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,cuddle [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Cuddle!', description: `${message.author} cuddles ${target}! 🥰` })] });
    }
};
