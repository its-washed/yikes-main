const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'warnings', description: 'View warnings for a user', usage: ',warnings [@user]' },
    aliases: ['warns'],
    cooldown: 3,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        const target = message.mentions.members.first() || message.member;
        const { readJSON } = require('../../utils/database');
        const warns = readJSON('warns.json') || {};
        const userWarns = warns[message.guild.id]?.[target.id] || [];

        if (!userWarns.length) return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `**${target.user.tag}** has no warnings.` })] });

        const list = userWarns.map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.moderator}> (<t:${Math.floor(w.time / 1000)}:R>)`).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: `Warnings — ${target.user.tag} (${userWarns.length})`, description: list.slice(0, 4000) })] });
    }
};
