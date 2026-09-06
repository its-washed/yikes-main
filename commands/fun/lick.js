const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'lick', description: 'Lick someone', usage: ',lick [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,lick [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Lick!', description: `${message.author} licks ${target}! 😛` })] });
    }
};
