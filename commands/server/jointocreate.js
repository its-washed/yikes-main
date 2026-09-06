const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');

module.exports = {
    data: {
        name: 'jointocreate',
        description: 'Set up join-to-create voice channels',
        usage: ',jointocreate [setup|disable|channel|category]'
    },
    aliases: ['jtc', 'vctemplate'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();
        const config = getGuildConfig(message.guild.id);

        if (!action || action === 'status') {
            const jtc = config.joinToCreate || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Join to Create',
                    fields: [
                        { name: 'Enabled', value: jtc.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: jtc.channel ? `<#${jtc.channel}>` : 'Not set', inline: true },
                        { name: 'Category', value: jtc.category ? `<#${jtc.category}>` : 'Auto', inline: true }
                    ]
                })]
            });
        }

        if (action === 'setup') {
            const channel = message.mentions.channels.first();
            if (!channel || channel.type !== ChannelType.GuildVoice) {
                return message.reply({ embeds: [errorEmbed('Invalid Channel', 'Mention a voice channel.')] });
            }

            try {
                let category;
                if (config.joinToCreate?.category) {
                    category = message.guild.channels.cache.get(config.joinToCreate.category);
                }
                if (!category) {
                    category = await message.guild.channels.create({
                        name: 'Voice Channels',
                        type: ChannelType.GuildCategory
                    });
                }

                updateGuildConfig(message.guild.id, {
                    joinToCreate: { enabled: true, channel: channel.id, category: category.id }
                });

                return message.reply({ embeds: [successEmbed('Join to Create', `Joining ${channel} will create a temporary voice channel in ${category}.`)] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
            }
        }

        if (action === 'category') {
            const channel = message.mentions.channels.first();
            if (!channel || channel.type !== ChannelType.GuildCategory) {
                return message.reply({ embeds: [errorEmbed('Invalid Channel', 'Mention a category channel.')] });
            }
            updateGuildConfig(message.guild.id, { joinToCreate: { ...config.joinToCreate, category: channel.id } });
            return message.reply({ embeds: [successEmbed('Category Set', `Temp channels will be created in ${channel}.`)] });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, { joinToCreate: { enabled: false } });
            return message.reply({ embeds: [successEmbed('Disabled', 'Join to create disabled.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `setup`, `category`, `disable`, `status`')] });
    }
};
