const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'levels',
        description: 'Configure leveling system',
        usage: ',levels [enable|disable|xp|channel] [value]'
    },
    aliases: ['level', 'xp'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const lvl = config.levels || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Levels Status',
                    fields: [
                        { name: 'Enabled', value: lvl.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'XP Per Message', value: `${lvl.xpPerMessage || 15}`, inline: true },
                        { name: 'Level Up Channel', value: lvl.levelUpChannel ? `<#${lvl.levelUpChannel}>` : 'Current channel', inline: true }
                    ]
                })]
            });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                levels: { ...config.levels, enabled: false }
            });
            return message.reply({ embeds: [successEmbed('Levels Disabled', 'Leveling system disabled.')] });
        }

        if (action === 'enable') {
            updateGuildConfig(message.guild.id, {
                levels: { enabled: true, xpPerMessage: config.levels?.xpPerMessage || 15, levelUpChannel: config.levels?.levelUpChannel || null }
            });
            return message.reply({ embeds: [successEmbed('Levels Enabled', 'Leveling system enabled.')] });
        }

        if (action === 'xp') {
            const xp = parseInt(args[1]) || 15;
            updateGuildConfig(message.guild.id, {
                levels: { ...config.levels, xpPerMessage: Math.min(Math.max(xp, 1), 100) }
            });
            return message.reply({
                embeds: [successEmbed('XP Updated', `XP per message set to ${xp}.`)]
            });
        }

        if (action === 'channel') {
            const channel = message.mentions.channels.first()?.id || message.channel.id;
            updateGuildConfig(message.guild.id, {
                levels: { ...config.levels, levelUpChannel: channel }
            });
            return message.reply({
                embeds: [successEmbed('Level Up Channel', `Level up messages will be sent to <#${channel}>.`)]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Usage', 'Usage: ,levels [enable|disable|status|xp|channel]')] });
    }
};
