const { PermissionFlagsBits } = require('discord.js');
const { parseMember, parseDuration, formatDuration, checkHierarchy } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'mute',
        description: 'Timeout a member',
        usage: ',mute @user [duration] [reason]'
    },
    aliases: ['timeout', 'tm'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Moderate Members` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Moderate Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        if (!checkHierarchy(message.member, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'You cannot timeout someone with an equal or higher role.')] });
        }

        if (!checkHierarchy(message.guild.members.me, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'I cannot timeout someone with an equal or higher role than me.')] });
        }

        let durationMs = 600000;
        let durationStr = '10 minutes';
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
            await target.timeout(durationMs, `${reason} | Timed out by ${message.author.tag}`);

            await target.send({
                embeds: [{
                    color: 0xffa502,
                    title: `You have been timed out in ${message.guild.name}`,
                    description: `**Duration:** ${durationStr}\n**Reason:** ${reason}`,
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [modLogEmbed('Mute (Timeout)', message.author, target, `${reason} | Duration: ${durationStr}`, 0xffa502)]
                });
            }

            return message.reply({
                embeds: [successEmbed('Member Muted', `**${target.user.tag}** has been timed out for ${durationStr}.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to mute: ${error.message}`)] });
        }
    }
};
