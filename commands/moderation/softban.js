const { PermissionFlagsBits } = require('discord.js');
const { parseMember, checkHierarchy } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'softban',
        description: 'Ban and immediately unban to delete messages',
        usage: ',softban @user [reason]'
    },
    aliases: ['sb'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Ban Members` permission.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });
        if (!checkHierarchy(message.member, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'Cannot softban someone with equal/higher role.')] });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.ban({ deleteMessageDays: 7, reason: `Softban by ${message.author.tag}: ${reason}` });
            await message.guild.members.unban(target.id, 'Softban - messages purged');

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({ embeds: [modLogEmbed('Softban', message.author, target, reason, 0xffa502)] });
            }

            return message.reply({
                embeds: [successEmbed('Softban', `**${target.user.tag}** has been softbanned. Last 7 days of messages deleted.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
