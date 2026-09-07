const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { resolve } = require('../../utils/variables');

module.exports = {
    data: {
        name: 'voicemaster',
        description: 'Setup VoiceMaster temporary voice channels',
        usage: ',voicemaster <setup|category|name|bitrate|limit|interface> [args]'
    },
    aliases: ['vm'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `setup`, `category`, `name`, `bitrate`, `limit`, `interface`')] });

        if (sub === 'setup') {
            const category = await message.guild.channels.create({
                name: 'VoiceMaster',
                type: ChannelType.GuildCategory
            });

            const jtc = await message.guild.channels.create({
                name: '+ Join to Create',
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    { id: message.guild.id, allow: [PermissionFlagsBits.Connect] }
                ]
            });

            const iface = await message.guild.channels.create({
                name: 'voice-interface',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: message.guild.id, deny: [PermissionFlagsBits.SendMessages] }
                ]
            });

            const embed = createEmbed({
                color: 0x6c5ce7,
                title: 'VoiceMaster',
                description: 'Join the voice channel below to create your own temporary channel.\n\nUse the buttons to customize your channel.'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vm_hide').setLabel('Hide').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vm_reveal').setLabel('Reveal').setEmoji('👀').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vm_limit').setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vm_rename').setLabel('Rename').setEmoji('✏️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setEmoji('👑').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('vm_transfer').setLabel('Transfer').setEmoji('🔄').setStyle(ButtonStyle.Primary)
            );

            await iface.send({ embeds: [embed], components: [row, row2] });

            updateGuildConfig(message.guild.id, {
                voicemaster: {
                    enabled: true,
                    joinToCreateId: jtc.id,
                    interfaceId: iface.id,
                    categoryId: category.id,
                    name: "{user.display_name}'s VC",
                    bitrate: 64000
                }
            });

            return message.reply({ embeds: [successEmbed('VoiceMaster Setup', `Category: ${category}\nJoin to Create: ${jtc}\nInterface: ${iface}`)] });
        }

        if (sub === 'category') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a category to redirect channels to.')] });
            updateGuildConfig(message.guild.id, { voicemaster: { ...config.voicemaster, categoryId: channel.id } });
            return message.reply({ embeds: [successEmbed('Category Set', `Channels go to **${channel.name}**`)] });
        }

        if (sub === 'name') {
            const name = args.slice(1).join(' ');
            if (!name) return message.reply({ embeds: [errorEmbed('No Name', 'Use variables: `{user}`, `{user.name}`, `{user.display_name}`')] });
            updateGuildConfig(message.guild.id, { voicemaster: { ...config.voicemaster, name } });
            return message.reply({ embeds: [successEmbed('Name Set', `Default name: \`${name}\``)] });
        }

        if (sub === 'bitrate') {
            const br = parseInt(args[1]) || 64;
            if (br < 8 || br > 384) return message.reply({ embeds: [errorEmbed('Invalid', 'Bitrate must be 8-384.')] });
            updateGuildConfig(message.guild.id, { voicemaster: { ...config.voicemaster, bitrate: br } });
            return message.reply({ embeds: [successEmbed('Bitrate Set', `Default bitrate: ${br}kbps`)] });
        }

        if (sub === 'limit') {
            const limit = parseInt(args[1]) || 0;
            if (limit < 0 || limit > 99) return message.reply({ embeds: [errorEmbed('Invalid', 'Limit must be 0-99.')] });
            updateGuildConfig(message.guild.id, { voicemaster: { ...config.voicemaster, userLimit: limit } });
            return message.reply({ embeds: [successEmbed('Limit Set', `Default limit: ${limit || 'unlimited'}`)] });
        }

        if (sub === 'interface') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a text channel for the interface.')] });
            updateGuildConfig(message.guild.id, { voicemaster: { ...config.voicemaster, interfaceId: channel.id } });
            return message.reply({ embeds: [successEmbed('Interface Set', `Interface channel: ${channel}`)] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    }
};
