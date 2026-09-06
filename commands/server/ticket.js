const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'ticket',
        description: 'Ticket system — create support tickets',
        usage: ',ticket [setup|disable|category|log|close]'
    },
    aliases: ['tickets', 'supportticket'],
    cooldown: 10,

    async execute(message, args, client, config) {
        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const t = config.tickets || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Ticket System',
                    fields: [
                        { name: 'Enabled', value: t.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Category', value: t.category ? `<#${t.category}>` : 'Not set', inline: true },
                        { name: 'Log Channel', value: t.logChannel ? `<#${t.logChannel}>` : 'Not set', inline: true },
                        { name: 'Support Role', value: t.supportRole ? `<@&${t.supportRole}>` : 'Not set', inline: true },
                        { name: 'Open Tickets', value: `${t.openCount || 0}`, inline: true }
                    ]
                })]
            });
        }

        if (action === 'setup') {
            if (!isAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
            }

            try {
                const category = await message.guild.channels.create({
                    name: 'Tickets',
                    type: ChannelType.GuildCategory
                });

                const ticketChannel = await message.guild.channels.create({
                    name: 'open-tickets',
                    type: ChannelType.GuildText,
                    parent: category.id,
                    topic: 'Click the button below to create a support ticket.'
                });

                const embed = createEmbed({
                    color: 0x6c5ce7,
                    title: 'Support Tickets',
                    description: 'Need help? Click the button below to create a support ticket.\n\nA private channel will be created for you and our staff team.'
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create')
                        .setLabel('Create Ticket')
                        .setEmoji('🎫')
                        .setStyle(ButtonStyle.Primary)
                );

                await ticketChannel.send({ embeds: [embed], components: [row] });

                const supportRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('support') || r.name.toLowerCase().includes('staff'));

                updateGuildConfig(message.guild.id, {
                    tickets: {
                        enabled: true,
                        category: category.id,
                        ticketChannel: ticketChannel.id,
                        logChannel: null,
                        supportRole: supportRole?.id || null,
                        openCount: 0
                    }
                });

                return message.reply({
                    embeds: [successEmbed('Ticket System Setup', `Category: ${category}\nTicket Channel: ${ticketChannel}${supportRole ? `\nSupport Role: ${supportRole}` : ''}\n\nUse \`,ticket role @role\` to set the support role.`)]
                });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'role') {
            if (!isAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
            }

            const role = message.mentions.roles.first();
            if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Please mention a support role.')] });

            updateGuildConfig(message.guild.id, {
                tickets: { ...config.tickets, supportRole: role.id }
            });

            return message.reply({ embeds: [successEmbed('Support Role', `Set to ${role}.`)] });
        }

        if (action === 'log') {
            if (!isAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
            }

            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Please mention a log channel.')] });

            updateGuildConfig(message.guild.id, {
                tickets: { ...config.tickets, logChannel: channel.id }
            });

            return message.reply({ embeds: [successEmbed('Ticket Log', `Logs will be sent to ${channel}.`)] });
        }

        if (action === 'close') {
            if (!message.channel.name?.startsWith('ticket-')) {
                return message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not a ticket channel.')] });
            }

            const userId = message.channel.name.replace('ticket-', '');
            const member = message.guild.members.cache.get(userId);

            const logEmbed = createEmbed({
                color: 0xff4757,
                title: 'Ticket Closed',
                description: `Closed by ${message.author}`,
                fields: [{ name: 'User', value: member ? `${member.user.tag}` : userId, inline: true }]
            });

            if (config.tickets?.logChannel) {
                const logChannel = message.guild.channels.cache.get(config.tickets.logChannel);
                if (logChannel) logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }

            await message.reply({ embeds: [successEmbed('Closing Ticket', 'This ticket will be deleted in 5 seconds...')] });
            setTimeout(() => message.channel.delete().catch(() => {}), 5000);
            return;
        }

        if (action === 'disable') {
            if (!isAdmin(message.member)) {
                return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
            }
            updateGuildConfig(message.guild.id, { tickets: { enabled: false } });
            return message.reply({ embeds: [successEmbed('Tickets Disabled', 'Ticket system disabled.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `setup`, `role`, `log`, `close`, `disable`, `status`')] });
    }
};
