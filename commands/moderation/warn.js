const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'warn', description: 'Warn a user', usage: ',warn <@user> <reason>' },
    cooldown: 3,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ').replace(/<@\d+>/g, '').trim();
        if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',warn @user <reason>')] });

        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Self', 'You cannot warn yourself.')] });
        if (target.user.bot) return message.reply({ embeds: [errorEmbed('Bot', 'Cannot warn bots.')] });

        const { readJSON, writeJSON } = require('../../utils/database');
        const warns = readJSON('warns.json') || {};
        if (!warns[message.guild.id]) warns[message.guild.id] = {};
        if (!warns[message.guild.id][target.id]) warns[message.guild.id][target.id] = [];
        warns[message.guild.id][target.id].push({
            moderator: message.author.id,
            reason: reason || 'No reason',
            time: Date.now()
        });
        writeJSON('warns.json', warns);

        const count = warns[message.guild.id][target.id].length;
        return message.reply({ embeds: [successEmbed('Warned', `**${target.user.tag}** has been warned (${count} total).\nReason: ${reason || 'No reason'}`)] });
    }
};
