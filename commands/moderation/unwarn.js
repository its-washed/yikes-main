const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'unwarn', description: 'Remove a warning', usage: ',unwarn <@user> <number>' },
    cooldown: 3,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        const target = message.mentions.members.first();
        const num = parseInt(args[1]);
        if (!target || !num) return message.reply({ embeds: [errorEmbed('Usage', ',unwarn @user <number>')] });

        const { readJSON, writeJSON } = require('../../utils/database');
        const warns = readJSON('warns.json') || {};
        const userWarns = warns[message.guild.id]?.[target.id] || [];

        if (num < 1 || num > userWarns.length) {
            return message.reply({ embeds: [errorEmbed('Invalid', `User has ${userWarns.length} warning(s).`)] });
        }

        userWarns.splice(num - 1, 1);
        writeJSON('warns.json', warns);
        return message.reply({ embeds: [successEmbed('Unwarned', `Removed warning **${num}** from **${target.user.tag}**.`)] });
    }
};
