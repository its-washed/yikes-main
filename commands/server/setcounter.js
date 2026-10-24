const { ChannelType } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { COUNTER_TYPES, updateCounter } = require('./counter');

module.exports = {
    data: { name: 'setcounter', description: 'Set counter channel', usage: ',setcounter [#channel] [type]' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, 'ManageGuild')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,setcounter [#channel] [type]')] });
        }

        const type = args[1]?.toLowerCase();
        if (!type || !COUNTER_TYPES[type]) {
            const list = Object.keys(COUNTER_TYPES).map(k => `\`${k}\``).join(', ');
            return message.reply({ embeds: [errorEmbed('Invalid Type', `Valid types: ${list}`)] });
        }

        const channelType = channel.type === ChannelType.GuildVoice
            ? 'voice'
            : channel.type === ChannelType.GuildCategory
                ? 'category'
                : 'text';

        const counters = Array.isArray(config.counters) ? [...config.counters] : [];
        const existing = counters.find(c => c.type === type);
        const entry = {
            type,
            channelId: channel.id,
            channelType,
            name: existing?.name || `${COUNTER_TYPES[type].label}: {target}`,
            createdBy: message.author.id
        };

        if (existing) {
            Object.assign(existing, entry);
        } else {
            counters.push(entry);
        }

        updateGuildConfig(message.guild.id, { counters });
        await updateCounter(message.guild, entry);

        return message.reply({ embeds: [successEmbed('Counter Set', `**${COUNTER_TYPES[type].label}** counter set to ${channel}.`)] });
    }
};
