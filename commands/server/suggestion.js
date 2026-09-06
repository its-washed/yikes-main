const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'suggestion',
        description: 'Configure the suggestion system',
        usage: ',suggestion [setup|approve|deny|channel]'
    },
    aliases: ['suggest'],
    cooldown: 10,

    async execute(message, args, client, config) {
        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const s = config.suggestions || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Suggestion System',
                    fields: [
                        { name: 'Enabled', value: s.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: s.channel ? `<#${s.channel}>` : 'Not set', inline: true }
                    ]
                })]
            });
        }

        if (action === 'setup') {
            if (!isAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
            }

            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,suggestion setup #channel')] });

            updateGuildConfig(message.guild.id, {
                suggestions: { enabled: true, channel: channel.id }
            });

            return message.reply({ embeds: [successEmbed('Suggestions Enabled', `Suggestions will be sent to ${channel}.`)] });
        }

        if (action === 'approve' || action === 'deny') {
            if (!hasPermission(message.member, PermissionFlagsBits.ModerateMembers)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Moderate Members` permission.')] });
            }

            const msgId = args[1];
            if (!msgId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Provide the suggestion message ID.')] });

            try {
                const sChannel = message.guild.channels.cache.get(config.suggestions?.channel);
                if (!sChannel) return message.reply({ embeds: [errorEmbed('No Channel', 'Suggestion channel not configured.')] });

                const msg = await sChannel.messages.fetch(msgId);
                if (!msg) return message.reply({ embeds: [errorEmbed('Not Found', 'Suggestion message not found.')] });

                const embed = EmbedBuilder.from(msg.embeds[0]);
                const color = action === 'approve' ? 0x00d26a : 0xff4757;
                embed.setColor(color);
                embed.setFooter({ text: `${action === 'approve' ? 'Approved' : 'Denied'} by ${message.author.tag}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('sug_approve').setLabel('Approve').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('sug_deny').setLabel('Deny').setStyle(ButtonStyle.Danger).setDisabled(true)
                );

                await msg.edit({ embeds: [embed], components: [row] });
                return message.reply({ embeds: [successEmbed(`Suggestion ${action === 'approve' ? 'Approved' : 'Denied'}`, `The suggestion has been ${action}d.`)] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'channel') {
            if (!isAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
            }
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Please mention a channel.')] });
            updateGuildConfig(message.guild.id, { suggestions: { ...config.suggestions, channel: channel.id } });
            return message.reply({ embeds: [successEmbed('Channel Set', `Suggestions channel set to ${channel}.`)] });
        }

        if (!args[0]) {
            if (!config.suggestions?.enabled || !config.suggestions?.channel) {
                return message.reply({ embeds: [errorEmbed('Not Configured', 'Suggestions not set up. Ask an admin to run `,suggestion setup #channel`.')] });
            }

            const text = args.join(' ');
            if (!text) return message.reply({ embeds: [errorEmbed('Missing Content', 'Write your suggestion.')] });

            const channel = message.guild.channels.cache.get(config.suggestions.channel);
            if (!channel) return message.reply({ embeds: [errorEmbed('Channel Error', 'Suggestion channel not found.')] });

            const embed = createEmbed({
                color: 0x6c5ce7,
                author: { name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) },
                title: 'New Suggestion',
                description: text,
                footer: { text: `ID: pending | By ${message.author.tag}` }
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sug_approve').setLabel('Approve').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('sug_deny').setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            const msg = await channel.send({ embeds: [embed], components: [row] });
            await msg.react('👍');
            await msg.react('👎');

            return message.reply({ embeds: [successEmbed('Suggestion Submitted', `Your suggestion has been posted in ${channel}.`)] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `setup`, `approve`, `deny`, `channel`, or write your suggestion')] });
    }
};
