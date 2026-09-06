const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'setup',
        description: 'Interactive setup wizard for the bot',
        usage: ',setup [welcome|goodbye|logging|autorole|starboard|levels|antispam|automod]'
    },
    aliases: ['config'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission to run setup.')] });
        }

        const system = args[0]?.toLowerCase();

        if (!system) {
            const mainEmbed = createEmbed({
                color: 0x6c5ce7,
                title: 'Yikes Setup Wizard',
                description: 'Select a system to configure from the menu below.',
                fields: [
                    { name: 'Welcome System', value: 'Set up welcome messages for new members', inline: true },
                    { name: 'Goodbye System', value: 'Set up farewell messages', inline: true },
                    { name: 'Logging', value: 'Configure audit log channel', inline: true },
                    { name: 'Auto Role', value: 'Auto-assign roles to new members', inline: true },
                    { name: 'Starboard', value: 'Showcase starred messages', inline: true },
                    { name: 'Levels', value: 'XP and leveling system', inline: true },
                    { name: 'Anti-Spam', value: 'Automatic spam detection', inline: true },
                    { name: 'Auto Mod', value: 'Automatic content moderation', inline: true }
                ]
            });

            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('setup_select')
                    .setPlaceholder('Select a system to configure')
                    .addOptions([
                        { label: 'Welcome', value: 'welcome', description: 'Configure welcome messages' },
                        { label: 'Goodbye', value: 'goodbye', description: 'Configure farewell messages' },
                        { label: 'Logging', value: 'logging', description: 'Set up audit logging' },
                        { label: 'Auto Role', value: 'autorole', description: 'Auto-assign roles' },
                        { label: 'Starboard', value: 'starboard', description: 'Star message showcase' },
                        { label: 'Levels', value: 'levels', description: 'XP and leveling' },
                        { label: 'Anti-Spam', value: 'antispam', description: 'Spam detection' },
                        { label: 'Auto Mod', value: 'automod', description: 'Content moderation' }
                    ])
            );

            const reply = await message.reply({ embeds: [mainEmbed], components: [selectMenu] });

            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 60000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                const selected = interaction.values[0];
                await interaction.deferUpdate();
                await handleSetup(selected, message, config);
                await reply.delete().catch(() => {});
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    reply.edit({ embeds: [errorEmbed('Timed Out', 'Setup cancelled.')] });
                }
            });

            return;
        }

        await handleSetup(system, message, config);
    }
};

async function handleSetup(system, message, config) {
    switch (system) {
        case 'welcome': {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, { welcomeChannel: channel.id });
            return message.channel.send({
                embeds: [successEmbed('Welcome System', `Welcome messages will be sent to ${channel}.\nUse \`,welcome [message]\` to customize the message.`)]
            });
        }
        case 'goodbye': {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, { goodbyeChannel: channel.id });
            return message.channel.send({
                embeds: [successEmbed('Goodbye System', `Goodbye messages will be sent to ${channel}.\nUse \`,goodbye [message]\` to customize the message.`)]
            });
        }
        case 'logging': {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, { logChannel: channel.id });
            return message.channel.send({
                embeds: [successEmbed('Logging System', `Audit logs will be sent to ${channel}.`)]
            });
        }
        case 'autorole': {
            const role = message.mentions.roles.first();
            if (!role) {
                return message.channel.send({ embeds: [errorEmbed('Missing Role', 'Please mention a role to auto-assign.')] });
            }
            updateGuildConfig(message.guild.id, { autorole: role.id });
            return message.channel.send({
                embeds: [successEmbed('Auto Role', `New members will automatically receive ${role}.`)]
            });
        }
        case 'starboard': {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, {
                starboard: { enabled: true, channel: channel.id, threshold: 5 }
            });
            return message.channel.send({
                embeds: [successEmbed('Starboard', `Starboard enabled in ${channel}. Messages with 5+ ⭐ will be featured.`)]
            });
        }
        case 'levels': {
            updateGuildConfig(message.guild.id, {
                levels: { enabled: true, xpPerMessage: 15, levelUpChannel: message.channel.id }
            });
            return message.channel.send({
                embeds: [successEmbed('Levels', `Leveling system enabled. XP will be tracked in this server.`)]
            });
        }
        case 'antispam': {
            updateGuildConfig(message.guild.id, {
                antispam: { enabled: true, threshold: 5, interval: 10 }
            });
            return message.channel.send({
                embeds: [successEmbed('Anti-Spam', `Anti-spam enabled. Users sending 5+ messages in 10 seconds will be timed out.`)]
            });
        }
        case 'automod': {
            updateGuildConfig(message.guild.id, {
                automod: { enabled: true, words: [], links: true, maxMentions: 5 }
            });
            return message.channel.send({
                embeds: [successEmbed('Auto Mod', `Auto moderation enabled. Links and mass mentions will be filtered.`)]
            });
        }
        default:
            return message.channel.send({ embeds: [errorEmbed('Unknown System', 'Valid systems: welcome, goodbye, logging, autorole, starboard, levels, antispam, automod')] });
    }
}
