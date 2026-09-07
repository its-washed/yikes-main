const { Events, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');
const { resolve } = require('../utils/variables');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.guild) return;
        const config = getGuildConfig(interaction.guild.id);

        if (interaction.customId === 'ticket_create') {
            const ticketConfig = config.tickets || {};
            const topics = ticketConfig.topics || [];
            const topic = topics[0] || { name: 'Support', emoji: '🎫' };

            const supportRole = ticketConfig.supportRole;
            if (!supportRole) {
                return interaction.reply({ content: 'Ticket system not configured.', ephemeral: true });
            }

            const category = ticketConfig.categoryId ? interaction.guild.channels.cache.get(ticketConfig.categoryId) : null;

            try {
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: category?.id || null,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: interaction.guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                const openEmbed = ticketConfig.openEmbed || `{user.mention} has opened a ticket.\n**Topic:** ${topic.name}`;
                const ctx = { member: interaction.member, user: interaction.user, guild: interaction.guild, topic: topic.name };

                await ticketChannel.send({
                    content: `<@&${supportRole}>`,
                    embeds: [{
                        color: 0x6c5ce7,
                        description: resolve(openEmbed, ctx)
                    }],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                    )]
                });

                await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });

                const logs = ticketConfig.logsChannel ? interaction.guild.channels.cache.get(ticketConfig.logsChannel) : null;
                if (logs) {
                    logs.send({
                        embeds: [{
                            color: 0x00d26a,
                            title: 'Ticket Opened',
                            fields: [
                                { name: 'User', value: `${interaction.user.tag}`, inline: true },
                                { name: 'Channel', value: `${ticketChannel}`, inline: true },
                                { name: 'Topic', value: topic.name, inline: true }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    }).catch(() => {});
                }
            } catch (e) {
                logger.error(`ticket err: ${e.message}`);
                interaction.reply({ content: 'Failed to create ticket.', ephemeral: true });
            }
        }

        if (interaction.customId === 'ticket_close') {
            const member = interaction.guild.members.cache.get(interaction.user.id);
            const supportRole = config.tickets?.supportRole;
            const isSupport = supportRole && member?.roles.cache.has(supportRole);
            const isOwner = interaction.guild.ownerId === interaction.user.id;

            if (!isSupport && !isOwner) {
                return interaction.reply({ content: 'Only support staff can close tickets.', ephemeral: true });
            }

            const logsChannel = config.tickets?.logsChannel ? interaction.guild.channels.cache.get(config.tickets.logsChannel) : null;

            if (logsChannel) {
                const messages = await interaction.channel.messages.fetch({ limit: 50 });
                const transcript = messages.reverse().map(m => `[${m.author.tag}] ${m.content}`).join('\n').slice(0, 4000);
                logsChannel.send({
                    embeds: [{
                        color: 0xff4757,
                        title: 'Ticket Closed',
                        description: `Closed by ${interaction.user}\n\n**Transcript:**\n${transcript || 'No messages.'}`,
                        timestamp: new Date().toISOString()
                    }]
                }).catch(() => {});
            }

            await interaction.reply({ content: 'Ticket closing in 3 seconds...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 3000);
        }
    }
};
