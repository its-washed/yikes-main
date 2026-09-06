const { PermissionFlagsBits } = require('discord.js');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'unban',
        description: 'Unban a user by their ID',
        usage: ',unban <userID>'
    },
    aliases: ['ub'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Ban Members` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Ban Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing ID', 'Please provide the user ID to unban.')] });
        }

        const userId = args[0].replace(/[<@!>]/g, '');

        try {
            const banList = await message.guild.bans.fetch();
            const banned = banList.get(userId);

            if (!banned) {
                return message.reply({ embeds: [errorEmbed('Not Banned', 'That user is not banned from this server.')] });
            }

            await message.guild.members.unban(userId, `Unbanned by ${message.author.tag}`);

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [modLogEmbed('Unban', message.author, banned.user, 'Unbanned', 0x00d26a)]
                });
            }

            return message.reply({
                embeds: [successEmbed('Member Unbanned', `**${banned.user.tag}** has been unbanned.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to unban: ${error.message}`)] });
        }
    }
};
