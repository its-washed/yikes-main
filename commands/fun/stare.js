const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'stare', description: 'Stare at someone', usage: ',stare [@user]' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Stare!', description: `${message.author} stares at ${target}... 👀` })] });
    }
};
