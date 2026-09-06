const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { getWarnings } = require('../../utils/database');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'warnings',
        description: 'View warnings for a member',
        usage: ',warnings @user'
    },
    aliases: ['warns', 'infractions'],
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
            return message.reply({
                embeds: [createEmbed({
                    color: 0x74b9ff,
                    title: `Warnings for ${target.user.tag}`,
                    description: 'This user has no warnings.'
                })]
            });
        }

        const warningList = warnings.map((w, i) => {
            const mod = message.guild.members.cache.get(w.moderator);
            const date = new Date(w.timestamp).toLocaleDateString();
            return `**${i + 1}.** ${w.reason}\n> Moderator: ${mod ? mod.user.tag : 'Unknown'} | ${date} | ID: \`${w.id}\``;
        }).join('\n\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0xffa502,
                title: `Warnings for ${target.user.tag}`,
                description: warningList.length > 4000 ? warningList.slice(0, 4000) + '...' : warningList,
                fields: [{ name: 'Total', value: `${warnings.length} warning(s)`, inline: true }]
            })]
        });
    }
};
