const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'pfp', description: 'Get user profile picture', usage: ',pfp [@user]' },
    aliases: ['profilepic'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${user.tag}'s PFP`, image: { url: user.displayAvatarURL({ size: 1024, dynamic: true }) } })] });
    }
};
