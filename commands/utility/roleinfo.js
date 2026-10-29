const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roleinfo', description: "View information about a role", usage: ',roleinfo [@role]' },
    aliases: ['ri'],
    cooldown: 3,
    async execute(message, args) {
        const role = message.mentions.roles.first() || (message.member && message.member.roles.highest);
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,roleinfo [@role]')] });

        const DANGEROUS = {
            'Administrator': 'Administrator',
            'Ban Members': 'Ban Members',
            'Kick Members': 'Kick Members',
            'Mention Everyone': 'Mention Everyone',
            'Manage Channels': 'ManageChannels',
            'Manage Events': 'ManageEvents',
            'Manage Expressions': 'ManageGuildExpressions',
            'Manage Guild': 'ManageGuild',
            'Manage Roles': 'ManageRoles',
            'Manage Messages': 'ManageMessages',
            'Manage Webhooks': 'ManageWebhooks',
            'Manage Permissions': 'ManageRoles',
            'Manage Threads': 'ManageThreads',
            'Moderate Members': 'ModerateMembers',
            'Mute Members': 'MuteMembers',
            'Deafen Members': 'DeafenMembers',
            'Move Members': 'MoveMembers'
        };
        const dangerous = Object.entries(DANGEROUS)
            .filter(([, flag]) => role.permissions && role.permissions.has(flag))
            .map(([name]) => name);

        const fields = [
            { name: 'Role ID', value: `\`${role.id}\``, inline: true },
            { name: 'Role color', value: (role.hexColor && role.hexColor !== '#000000') ? `\`${role.hexColor}\`` : 'No color', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false },
            {
                name: `${role.members.size} Member${role.members.size !== 1 ? 's' : ''}`,
                value: (role.members.size < 7)
                    ? (role.members.map(m => `${m}`).join(', ') || 'None')
                    : `${role.members.map(m => `${m}`).slice(0, 7).join(', ')} + ${role.members.size - 7} others`,
                inline: false
            }
        ];
        if (dangerous.length) fields.push({ name: `⚠️ Dangerous Permissions`, value: dangerous.join(', '), inline: false });

        return message.reply({ embeds: [createEmbed({ color: (role.hexColor && role.hexColor !== '#000000') ? role.color : 0x729bb0, title: role.name, thumbnail: (role.icon ? { url: role.icon } : undefined), fields })] });
    }
};
