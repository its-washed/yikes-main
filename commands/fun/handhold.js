const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'handhold', description: 'Hold hands with someone', usage: ',handhold [@user]' },
    aliases: ['holdhands'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,handhold [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Hand Hold', description: `${message.author} holds hands with ${target}! 🤝` })] });
    }
};
