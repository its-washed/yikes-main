const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'pronouns', description: 'Look up user pronouns', usage: ',pronouns [@user]' },
    aliases: ['pronoun'],
    cooldown: 5,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${user.tag}`, description: '*Pronoun API not connected.*\n\nIntegrate with pronoundb.xyz for real data.' })] });
    }
};
