const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'joinedat', description: 'Show when user joined', usage: ',joinedat [@user]' },
    aliases: ['joinage'],
    cooldown: 3,
    async execute(message) {
        const member = message.mentions.members.first() || message.member;
        const ts = Math.floor(member.joinedTimestamp / 1000);
        const days = Math.floor((Date.now() - member.joinedTimestamp) / 86400000);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${member.user.tag}`, fields: [{ name: 'Joined', value: `<t:${ts}:R>`, inline: true }, { name: 'Days Ago', value: `${days}`, inline: true }] })] });
    }
};
