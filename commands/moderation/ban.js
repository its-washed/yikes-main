const { PermissionFlagsBits } = require('discord.js');
const { parseMember, checkHierarchy } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'ban',
        description: 'Ban a user from the server, even if they are not in it',
        usage: ',ban <@user|id> [reason] [--days 7]'
    },
    aliases: ['b'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [permissionDenied(message, 'ban_members')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [permissionDenied(message, 'ban_members', { bot: true })] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const member = parseMember(message, args[0]);
        let user = null;
        if (member) {
            user = member.user;
        } else {
            const rawId = args[0].replace(/[<@!>]/g, '');
            if (/^\d{17,20}$/.test(rawId)) {
                try {
                    user = await client.users.fetch(rawId);
                } catch {
                    user = null;
                }
            }
        }
        if (!user) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user. Mention them or provide their user ID.')] });
        }

        if (member) {
            if (!checkHierarchy(message.member, member, message.guild)) {
                return message.reply({ embeds: [errorEmbed('Hierarchy', 'You cannot ban someone with an equal or higher role.')] });
            }

            if (!checkHierarchy(message.guild.members.me, member, message.guild)) {
                return message.reply({ embeds: [errorEmbed('Hierarchy', 'I cannot ban someone with an equal or higher role than me.')] });
            }
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
            await user.send({
                embeds: [{
                    color: 0xff4757,
                    title: `You have been banned from ${message.guild.name}`,
                    description: `**Reason:** ${reason}`,
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});

            await message.guild.members.ban(user.id, {
                deleteMessageSeconds: days > 0 ? days * 86400 : undefined,
                reason: `${reason} | Banned by ${message.author.tag}`
            });

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [modLogEmbed('Ban', message.author, user, reason, 0xff4757)]
                });
            }

            return message.reply({
                embeds: [successEmbed('Member Banned', `**${user.tag}** has been banned${member ? '' : ' (they were not in the server)'}.${days > 0 ? ` Messages from the last ${days} day(s) deleted.` : ''}`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to ban: ${error.message}`)] });
        }
    }
};
