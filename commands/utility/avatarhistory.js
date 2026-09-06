const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'avatarhistory', description: 'Get user avatar history', usage: ',avatarhistory [@user]' },
    aliases: ['avh'],
    cooldown: 10,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${user.tag}'s Avatar`, description: `[Current Avatar](${user.displayAvatarURL({ size: 1024, dynamic: true })})\n\n*Avatar history requires database integration.*` })] });
    }
};
