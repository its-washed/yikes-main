const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { parseEmbed } = require('../utils/variables');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.guild) return;

        const config = getGuildConfig(interaction.guild.id);
        const bmConfig = config.buttonMessages || [];

        if (interaction.customId.startsWith('bm_')) {
            const btnId = interaction.customId.replace('bm_', '');
            const btn = bmConfig.find(b => b.id === btnId);
            if (!btn || !btn.response) return interaction.reply({ content: 'No response configured.', ephemeral: true });

            const ctx = { member: interaction.member, user: interaction.user, guild: interaction.guild };
            const parsed = parseEmbed(btn.response, ctx);
            if (parsed) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder();
                if (parsed.color) embed.setColor(parsed.color);
                if (parsed.title) embed.setTitle(parsed.title);
                if (parsed.description) embed.setDescription(parsed.description);
                if (parsed.fields) embed.addFields(parsed.fields);
                if (parsed.thumbnail) embed.setThumbnail(parsed.thumbnail.url);
                if (parsed.image) embed.setImage(parsed.image.url);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                const { resolve } = require('../utils/variables');
                return interaction.reply({ content: resolve(btn.response, ctx), ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('br_')) {
            const roleId = interaction.customId.replace('br_', '');
            const brConfig = config.buttonRoles || [];
            const entry = brConfig.find(b => b.messageId === interaction.message.id);
            if (!entry) return interaction.reply({ content: 'This button role is no longer configured.', ephemeral: true });

            const btn = entry.buttons.find(b => b.roleId === roleId);
            if (!btn) return interaction.reply({ content: 'Button not found.', ephemeral: true });

            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return interaction.reply({ content: 'Role no longer exists.', ephemeral: true });

            const member = interaction.member;
            const hasRole = member.roles.cache.has(roleId);

            try {
                if (hasRole) {
                    await member.roles.remove(roleId, 'Button role toggle');
                    return interaction.reply({ content: `Removed **${role.name}**.`, ephemeral: true });
                } else {
                    await member.roles.add(roleId, 'Button role toggle');
                    return interaction.reply({ content: `Added **${role.name}**.`, ephemeral: true });
                }
            } catch {
                return interaction.reply({ content: 'Failed to update role. Check my permissions.', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('vm_')) {
            const { PermissionFlagsBits } = require('discord.js');
            const member = interaction.member;
            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
            }

            const { tempChannels } = require('../events/voiceMaster');
            const tcData = tempChannels.get(voiceChannel.id);

            if (!tcData || tcData.ownerId !== member.id) {
                return interaction.reply({ content: 'You don\'t own this channel.', ephemeral: true });
            }

            const action = interaction.customId.replace('vm_', '');

            if (action === 'lock') {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                return interaction.reply({ content: 'Channel locked.', ephemeral: true });
            }
            if (action === 'unlock') {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                return interaction.reply({ content: 'Channel unlocked.', ephemeral: true });
            }
            if (action === 'hide') {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
                return interaction.reply({ content: 'Channel hidden.', ephemeral: true });
            }
            if (action === 'reveal') {
                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true });
                return interaction.reply({ content: 'Channel revealed.', ephemeral: true });
            }
            if (action === 'limit') {
                const newLimit = voiceChannel.userLimit >= 99 ? 0 : voiceChannel.userLimit + 1;
                await voiceChannel.setUserLimit(newLimit);
                return interaction.reply({ content: `Limit set to ${newLimit || 'unlimited'}.`, ephemeral: true });
            }
            if (action === 'rename') {
                return interaction.reply({ content: 'Use `,voice rename <name>` to rename.', ephemeral: true });
            }
            if (action === 'claim') {
                tcData.ownerId = member.id;
                return interaction.reply({ content: 'You are now the owner.', ephemeral: true });
            }
            if (action === 'transfer') {
                return interaction.reply({ content: 'Use `,voice transfer @user` to transfer.', ephemeral: true });
            }
        }
    }
};
