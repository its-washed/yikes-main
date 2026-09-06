const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { addWarning, getWarningCount } = require('../../utils/database');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'warn',
        description: 'Issue a warning to a member',
        usage: ',warn @user [reason]'
    },
    aliases: ['w'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Moderate Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        if (target.id === message.author.id) {
            return message.reply({ embeds: [errorEmbed('Self Warning', 'You cannot warn yourself.')] });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const warning = addWarning(message.guild.id, target.id, message.author.id, reason);
        const totalWarnings = getWarningCount(message.guild.id, target.id);

        try {
            await target.send({
                embeds: [{
                    color: 0xffa502,
                    title: `Warning in ${message.guild.name}`,
                    description: `**Reason:** ${reason}\n**Total Warnings:** ${totalWarnings}`,
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});
        } catch (error) {}

        const logChannel = message.guild.channels.cache.get(config.logChannel);
        if (logChannel) {
            logChannel.send({
                embeds: [modLogEmbed('Warn', message.author, target, `${reason} (Warning #${totalWarnings})`, 0xffa502)]
            });
        }

        return message.reply({
            embeds: [successEmbed('Warning Issued', `**${target.user.tag}** has been warned. They now have **${totalWarnings}** warning(s).`)]
        });
    }
};
