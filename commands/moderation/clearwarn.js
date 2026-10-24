const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { readJSON, writeJSON } = require('../../utils/database');
const { errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'clearwarn',
        description: 'Remove warnings from a member',
        usage: ',clearwarn @user [number]'
    },
    aliases: ['delwarn', 'removewarn'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [permissionDenied(message, 'moderate_members')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        const warns = readJSON('warns.json') || {};
        const userWarns = warns[message.guild.id]?.[target.id] || [];

        if (userWarns.length === 0) {
            return message.reply({ embeds: [errorEmbed('No Warnings', 'This user has no warnings.')] });
        }

        const num = args[1] ? parseInt(args[1], 10) : null;

        if (args[1] && (!num || num < 1 || num > userWarns.length)) {
            return message.reply({ embeds: [errorEmbed('Invalid', `User has ${userWarns.length} warning(s).`)] });
        }

        if (num) {
            userWarns.splice(num - 1, 1);
        } else {
            warns[message.guild.id][target.id] = [];
        }
        writeJSON('warns.json', warns);

        const remaining = warns[message.guild.id]?.[target.id]?.length || 0;

        return message.reply({
            embeds: [successEmbed('Warning Removed', `Removed ${num ? `warning **${num}**` : 'all warnings'} from **${target.user.tag}**. They now have **${remaining}** warning(s).`)]
        });
    }
};
