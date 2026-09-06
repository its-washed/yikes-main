const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'automod',
        description: 'Configure auto moderation',
        usage: ',automod [enable|disable|status] [links|words|mentions]'
    },
    aliases: ['am'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const am = config.automod || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Auto Mod Status',
                    fields: [
                        { name: 'Enabled', value: am.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Links', value: am.links ? 'Blocked' : 'Allowed', inline: true },
                        { name: 'Max Mentions', value: `${am.maxMentions || 5}`, inline: true },
                        { name: 'Banned Words', value: `${am.words?.length || 0} word(s)`, inline: true }
                    ]
                })]
            });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                automod: { ...config.automod, enabled: false }
            });
            return message.reply({ embeds: [successEmbed('Auto Mod Disabled', 'Auto moderation has been disabled.')] });
        }

        if (action === 'enable') {
            updateGuildConfig(message.guild.id, {
                automod: { enabled: true, links: true, maxMentions: 5, words: config.automod?.words || [] }
            });
            return message.reply({ embeds: [successEmbed('Auto Mod Enabled', 'Links and mass mentions will now be filtered.')] });
        }

        if (action === 'links') {
            const links = args[1]?.toLowerCase() !== 'off';
            updateGuildConfig(message.guild.id, {
                automod: { ...config.automod, links }
            });
            return message.reply({
                embeds: [successEmbed('Links Filter', `Link filtering ${links ? 'enabled' : 'disabled'}.`)]
            });
        }

        if (action === 'mentions') {
            const max = parseInt(args[1]) || 5;
            updateGuildConfig(message.guild.id, {
                automod: { ...config.automod, maxMentions: max }
            });
            return message.reply({
                embeds: [successEmbed('Mention Limit', `Max mentions per message set to ${max}.`)]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Usage', 'Usage: ,automod [enable|disable|status|links|mentions]')] });
    }
};
