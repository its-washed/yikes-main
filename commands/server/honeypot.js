const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'honeypot',
        description: 'Set up a honeypot channel that auto-bans anyone who types in it',
        usage: ',honeypot [setup|disable|channel|role|log]'
    },
    aliases: ['trap', 'antiraid'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const hp = config.honeypot || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: 'Honeypot System',
                    description: 'Creates invisible trap channels. Anyone who types in them is automatically banned.',
                    fields: [
                        { name: 'Enabled', value: hp.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: hp.channel ? `<#${hp.channel}>` : 'Not set', inline: true },
                        { name: 'Auto Role', value: hp.role ? `<@&${hp.role}>` : 'None', inline: true },
                        { name: 'Log Channel', value: hp.logChannel ? `<#${hp.logChannel}>` : 'None', inline: true },
                        { name: 'Ban Count', value: `${hp.bans || 0}`, inline: true }
                    ]
                })]
            });
        }

        if (action === 'setup') {
            try {
                const channel = await message.guild.channels.create({
                    name: 'rules',
                    type: ChannelType.GuildText,
                    topic: 'Server rules — please read before chatting.'
                });

                const everyone = message.guild.roles.everyone;
                await channel.permissionOverwrites.edit(everyone, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                const botPerms = message.guild.members.me.roles.highest;
                await channel.permissionOverwrites.edit(botPerms, {
                    ViewChannel: true,
                    SendMessages: true,
                    ManageChannels: true
                });

                const embed = createEmbed({
                    color: 0xff4757,
                    title: 'Don\'t send messages to this channel.',
                    description: 'This channel is a honeypot for compromised accounts and selfbots.\nLegit members have no reason to type here. Any message will be treated as evidence of a hijacked account and the sender will be **SOFTBAN** immediately, automatically, and without warning.',
                    footer: { text: 'caught: 0' }
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('honeypot_caught')
                        .setLabel('caught: 0')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                );

                const honeypotMsg = await channel.send({ embeds: [embed], components: [row] });

                updateGuildConfig(message.guild.id, {
                    honeypot: { enabled: true, channel: channel.id, bans: 0, logChannel: null, role: null, messageId: honeypotMsg.id }
                });

                return message.reply({
                    embeds: [successEmbed('Honeypot Created', `Created honeypot channel ${channel}.\nAnyone who types there will be banned.`)]
                });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'channel') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Please mention a channel.')] });

            const embed = createEmbed({
                color: 0xff4757,
                title: 'Don\'t send messages to this channel.',
                description: 'This channel is a honeypot for compromised accounts and selfbots.\nLegit members have no reason to type here. Any message will be treated as evidence of a hijacked account and the sender will be **SOFTBAN** immediately, automatically, and without warning.',
                footer: { text: 'caught: 0' }
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('honeypot_caught')
                    .setLabel('caught: 0')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

            const honeypotMsg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);

            updateGuildConfig(message.guild.id, {
                honeypot: { ...config.honeypot, enabled: true, channel: channel.id, messageId: honeypotMsg?.id || null }
            });

            return message.reply({ embeds: [successEmbed('Honeypot Channel', `${channel} is now a honeypot.`)] });
        }

        if (action === 'role') {
            const role = message.mentions.roles.first();
            if (!role) {
                updateGuildConfig(message.guild.id, { honeypot: { ...config.honeypot, role: null } });
                return message.reply({ embeds: [successEmbed('Honeypot Role', 'Removed role requirement. All users will be trapped.')] });
            }

            updateGuildConfig(message.guild.id, {
                honeypot: { ...config.honeypot, role: role.id }
            });

            return message.reply({ embeds: [successEmbed('Honeypot Role', `Only users without ${role} will be trapped.`)] });
        }

        if (action === 'log') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Please mention a log channel.')] });

            updateGuildConfig(message.guild.id, {
                honeypot: { ...config.honeypot, logChannel: channel.id }
            });

            return message.reply({ embeds: [successEmbed('Honeypot Log', `Honeypot bans will be logged to ${channel}.`)] });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                honeypot: { enabled: false, channel: null, bans: 0 }
            });
            return message.reply({ embeds: [successEmbed('Honeypot Disabled', 'Honeypot system disabled.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `setup`, `channel`, `role`, `log`, `disable`, `status`')] });
    }
};
