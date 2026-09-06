const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'stab', description: 'Stab someone', usage: ',stab [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,stab [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Stab!', description: `${message.author} stabs ${target}! 🔪` })] });
    }
};
