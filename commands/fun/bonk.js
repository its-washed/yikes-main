const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'bonk', description: 'Bonk someone', usage: ',bonk [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ content: 'Bonk! 🏒 *You bonk the air*' });
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'BONK!', description: `${message.author} bonks ${target}! 🏒` })] });
    }
};
