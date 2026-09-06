const { Events, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'ticket_create') {
            const config = getGuildConfig(interaction.guild.id);
            const t = config.tickets;

            if (!t?.enabled || !t.category) {
                return interaction.reply({ content: 'Ticket system not configured.', ephemeral: true });
            }

            const existing = interaction.guild.channels.cache.find(c =>
                c.name === `ticket-${interaction.user.id}` && c.parentId === t.category
            );

            if (existing) {
                return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
            }

            try {
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.id}`,
                    type: ChannelType.GuildText,
                    parent: t.category,
                    topic: `Support ticket for ${interaction.user.tag}`
                });

                const perms = [
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                ];

                if (t.supportRole) {
                    perms.push({ id: t.supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                }

                if (interaction.guild.members.me) {
                    perms.push({ id: interaction.guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] });
                }

                await ticketChannel.overwritePermissions(perms);

                const { createEmbed } = require('../../utils/embeds');

                const embed = createEmbed({
                    color: 0x6c5ce7,
                    title: 'Support Ticket',
                    description: `Welcome ${interaction.user}!\n\nPlease describe your issue and a staff member will assist you shortly.\n\nTo close this ticket, type \`,ticket close\`.`
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ embeds: [embed], components: [row] });

                updateGuildConfig(interaction.guild.id, {
                    tickets: { ...t, openCount: (t.openCount || 0) + 1 }
                });

                if (t.logChannel) {
                    const logChannel = interaction.guild.channels.cache.get(t.logChannel);
                    if (logChannel) {
                        logChannel.send({
                            embeds: [createEmbed({
                                color: 0x00d26a,
                                title: 'Ticket Opened',
                                description: `${interaction.user} opened a ticket in ${ticketChannel}`
                            })]
                        }).catch(() => {});
                    }
                }

                await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: `Failed to create ticket: ${error.message}`, ephemeral: true });
            }
        }

        if (interaction.customId === 'ticket_close') {
            const config = getGuildConfig(interaction.guild.id);

            if (config.tickets?.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(config.tickets.logChannel);
                if (logChannel) {
                    const { createEmbed } = require('../../utils/embeds');
                    logChannel.send({
                        embeds: [createEmbed({
                            color: 0xff4757,
                            title: 'Ticket Closed',
                            description: `${interaction.user} closed a ticket in ${interaction.channel}`
                        })]
                    }).catch(() => {});
                }
            }

            await interaction.reply({ content: 'Closing ticket in 5 seconds...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
};
