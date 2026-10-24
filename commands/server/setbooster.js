const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { saveBoosterRole } = require('./boosters');

module.exports = {
    data: { name: 'setbooster', description: 'Set booster role', usage: ',setbooster [@role]' },
    aliases: ['boosterrole'],
    cooldown: 10,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        }

        const role = message.mentions.roles.first();
        if (!role) {
            return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,setbooster [@role]')] });
        }

        saveBoosterRole(message.guild.id, role.id);

        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `Booster role set to ${role}.` })] });
    }
};
