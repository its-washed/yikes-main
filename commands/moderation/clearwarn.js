const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { removeWarning, getWarnings } = require('../../utils/database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'clearwarn',
        description: 'Remove warnings from a member',
        usage: ',clearwarn @user [warningID]'
    },
    aliases: ['delwarn', 'removewarn'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Moderate Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        const warnings = getWarnings(message.guild.id, target.id);
        if (warnings.length === 0) {
            return message.reply({ embeds: [errorEmbed('No Warnings', 'This user has no warnings.')] });
        }

        const warningId = args[1];
        const success = removeWarning(message.guild.id, target.id, warningId);

        if (!success) {
            return message.reply({ embeds: [errorEmbed('Not Found', 'That warning ID was not found.')] });
        }

        const remaining = getWarnings(message.guild.id, target.id).length;

        return message.reply({
            embeds: [successEmbed('Warning Removed', `Removed ${warningId ? 'the specified warning' : 'all warnings'} from **${target.user.tag}**. They now have **${remaining}** warning(s).`)]
        });
    }
};
