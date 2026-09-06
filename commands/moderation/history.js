const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { getWarnings } = require('../../utils/database');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'history',
        description: 'View moderation history for a user',
        usage: ',history @user'
    },
    aliases: ['modhistory', 'casehistory'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Moderate Members` permission.')] });
        }

        const member = parseMember(message, args[0]);
        if (!member) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });

        const warnings = getWarnings(message.guild.id, member.id);
        const roles = member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.name).join(', ') || 'None';

        const entries = [];

        if (member.bannable) {
            entries.push('• Not banned');
        } else {
            entries.push('• **Currently banned**');
        }

        if (member.isCommunicationDisabled()) {
            const ends = new Date(member.communicationDisabledUntil).toLocaleString();
            entries.push(`• **Currently timed out** until ${ends}`);
        } else {
            entries.push('• Not timed out');
        }

        entries.push(`• Roles: ${roles}`);
        entries.push(`• Joined: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`);
        entries.push(`• Account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`);

        if (warnings.length > 0) {
            entries.push(`\n**Warnings (${warnings.length}):**`);
            warnings.forEach((w, i) => {
                const mod = message.guild.members.cache.get(w.moderator);
                const date = new Date(w.timestamp).toLocaleDateString();
                entries.push(`${i + 1}. ${w.reason} — ${mod ? mod.user.tag : 'Unknown'} (${date})`);
            });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Mod History — ${member.user.tag}`,
                description: entries.join('\n'),
                thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) }
            })]
        });
    }
};
