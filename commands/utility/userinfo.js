const { parseMember } = require('../../utils/helpers');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'userinfo',
        description: 'Get user information',
        usage: ',userinfo [@user]'
    },
    aliases: ['ui', 'whois'],
    cooldown: 5,

    async execute(message, args) {
        const member = parseMember(message, args[0]) || message.member;
        const user = member.user;

        const roles = member.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `${r}`)
            .join(', ') || 'None';

        const permissions = member.permissions.toArray();
        const keyPerms = permissions.filter(p =>
            ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers', 'ManageMessages', 'MentionEveryone', 'ManageWebhooks'].includes(p)
        );

        const embed = createEmbed({
            color: user.accentColor || 0x6c5ce7,
            title: user.tag,
            thumbnail: { url: user.displayAvatarURL({ size: 1024, dynamic: true }) },
            fields: [
                { name: 'ID', value: user.id, inline: true },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Top Role', value: member.roles.highest.id === message.guild.id ? 'None' : `${member.roles.highest}`, inline: true },
                { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.length > 1024 ? roles.slice(0, 1021) + '...' : roles, inline: false },
                { name: 'Key Permissions', value: keyPerms.length > 0 ? keyPerms.join(', ') : 'None', inline: false }
            ]
        });

        return message.reply({ embeds: [embed] });
    }
};
