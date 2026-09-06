const { PermissionFlagsBits } = require('discord.js');
const { parseMember, checkHierarchy } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'kick',
        description: 'Kick a member from the server',
        usage: ',kick @user [reason]'
    },
    aliases: ['k'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Kick Members` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Kick Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        if (!checkHierarchy(message.member, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'You cannot kick someone with an equal or higher role.')] });
        }

        if (!checkHierarchy(message.guild.members.me, target, message.guild)) {
            return message.reply({ embeds: [errorEmbed('Hierarchy', 'I cannot kick someone with an equal or higher role than me.')] });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.send({
                embeds: [{
                    color: 0xffa502,
                    title: `You have been kicked from ${message.guild.name}`,
                    description: `**Reason:** ${reason}`,
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => {});

            await target.kick(`${reason} | Kicked by ${message.author.tag}`);

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [modLogEmbed('Kick', message.author, target, reason, 0xffa502)]
                });
            }

            return message.reply({
                embeds: [successEmbed('Member Kicked', `**${target.user.tag}** has been kicked.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to kick: ${error.message}`)] });
        }
    }
};
