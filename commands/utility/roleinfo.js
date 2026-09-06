const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roleinfo', description: 'Get role information', usage: ',roleinfo [@role]' },
    aliases: ['ri'],
    cooldown: 3,
    async execute(message, args) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,roleinfo [@role]')] });
        return message.reply({ embeds: [createEmbed({ color: role.color || 0x6c5ce7, title: `Role — ${role.name}`, fields: [{ name: 'ID', value: role.id, inline: true }, { name: 'Color', value: role.hexColor, inline: true }, { name: 'Members', value: `${role.members.size}`, inline: true }, { name: 'Position', value: `${role.position}`, inline: true }, { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true }, { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true }, { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true }] })] });
    }
};
