const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'whois', description: 'Detailed user info', usage: ',whois [@user]' },
    aliases: ['ui'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);
        const roles = member ? member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(', ') || 'None' : 'N/A';
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: user.tag, thumbnail: { url: user.displayAvatarURL({ size: 1024 }) }, fields: [{ name: 'ID', value: user.id, inline: true }, { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }, { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }, { name: 'Joined', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true }, { name: 'Roles', value: roles.slice(0, 1024), inline: false }, { name: 'Highest Role', value: member?.roles?.highest?.toString() || 'N/A', inline: true }] })] });
    }
};
