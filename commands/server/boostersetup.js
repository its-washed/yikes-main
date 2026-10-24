const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { saveBoosterRole } = require('./boosters');

module.exports = {
    data: { name: 'boostersetup', description: 'Setup booster roles', usage: ',boostersetup [@role]' },
    aliases: ['bssetup'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,boostersetup [@role]')] });
        saveBoosterRole(message.guild.id, role.id);
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Booster Setup', description: `Booster role set to ${role}.\n\nBoosters will receive this role on boost.` })] });
    }
};
