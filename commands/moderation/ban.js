const { PermissionFlagsBits } = require('discord.js');
const { parseMember, checkHierarchy } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'ban',
        description: 'Ban a member from the server',
        usage: ',ban @user [reason] [--days 7]'
    },
    aliases: ['b'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Ban Members` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Ban Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        if (!checkHierarchy(message.member, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'You cannot ban someone with an equal or higher role.')] });
        }

        if (!checkHierarchy(message.guild.members.me, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'I cannot ban someone with an equal or higher role than me.')] });
        }

        let days = 0;
        let reasonArgs = [...args];
        const daysIndex = args.findIndex(a => a.toLowerCase() === '--days');
        if (daysIndex !== -1 && args[daysIndex + 1]) {
            days = Math.min(parseInt(args[daysIndex + 1]) || 0, 7);
            reasonArgs.splice(daysIndex, 2);
        }
        reasonArgs.shift();
        const reason = reasonArgs.join(' ') || 'No reason provided';

        try {
            await target.send({
                embeds: [{
                    color: 0xff4757,
                    title: `You have been banned from ${message.guild.name}`,
                    description: `**Reason:** ${reason}`,
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});

            await target.ban({ deleteMessageDays: days, reason: `${reason} | Banned by ${message.author.tag}` });

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [modLogEmbed('Ban', message.author, target, reason, 0xff4757)]
                });
            }

            return message.reply({
                embeds: [successEmbed('Member Banned', `**${target.user.tag}** has been banned.${days > 0 ? ` Messages from the last ${days} day(s) deleted.` : ''}`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to ban: ${error.message}`)] });
        }
    }
};
