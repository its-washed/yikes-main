const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'bully', description: 'Bully someone', usage: ',bully [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,bully [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Bully!', description: `${message.author} bullies ${target}! 😈` })] });
    }
};
