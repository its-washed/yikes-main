const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'wink', description: 'Wink at someone', usage: ',wink [@user]' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Wink!', description: `${message.author} winks at ${target}! 😉` })] });
    }
};
