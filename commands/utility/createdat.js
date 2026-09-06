const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'createdat', description: 'Show when account was created', usage: ',createdat [@user]' },
    aliases: ['accountage'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const ts = Math.floor(user.createdTimestamp / 1000);
        const days = Math.floor((Date.now() - user.createdTimestamp) / 86400000);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${user.tag}`, fields: [{ name: 'Created', value: `<t:${ts}:R>`, inline: true }, { name: 'Days Old', value: `${days}`, inline: true }] })] });
    }
};
