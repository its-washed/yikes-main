const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'kiss', description: 'Kiss someone', usage: ',kiss [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,kiss [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Kiss!', description: `${message.author} kisses ${target}! 💋` })] });
    }
};
