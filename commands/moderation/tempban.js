const { PermissionFlagsBits } = require('discord.js');
const { parseMember, parseDuration, formatDuration, checkHierarchy } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'tempban',
        description: 'Temporarily ban a member',
        usage: ',tempban @user [duration] [reason]'
    },
    aliases: ['tban'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Ban Members` permission.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });
        if (!checkHierarchy(message.member, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'Cannot ban someone with equal/higher role.')] });
        }

        let durationMs = 86400000;
        let durationStr = '1 day';
        let reasonArgs = [...args];
        reasonArgs.shift();

        const durationIndex = reasonArgs.findIndex(a => /^(\d+)(s|m|h|d)$/.test(a));
        if (durationIndex !== -1) {
            const parsed = parseDuration(reasonArgs[durationIndex]);
            if (parsed && parsed <= 2419200000) {
                durationMs = parsed;
                durationStr = formatDuration(parsed);
                reasonArgs.splice(durationIndex, 1);
            }
        }

        const reason = reasonArgs.join(' ') || 'No reason provided';

        try {
            await target.send({ embeds: [{ color: 0xff4757, title: `Temporarily banned from ${message.guild.name}`, description: `**Duration:** ${durationStr}\n**Reason:** ${reason}` }] }).catch(() => {});
            await target.ban({ reason: `Tempban by ${message.author.tag}: ${reason}` });

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({ embeds: [modLogEmbed('Tempban', message.author, target, `${reason} | Duration: ${durationStr}`, 0xff4757)] });
            }

            setTimeout(async () => {
                try { await message.guild.members.unban(target.id, 'Tempban expired'); } catch {}
            }, durationMs);

            return message.reply({ embeds: [successEmbed('Tempban', `**${target.user.tag}** banned for **${durationStr}**.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
