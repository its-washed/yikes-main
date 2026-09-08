const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'removeactivity', description: 'Remove activity leaderboard channels', usage: ',removeactivity' },
    aliases: ['removelb'],
    cooldown: 30,
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need `Manage Channels` permission.')] });
        }

        const config = getGuildConfig(message.guild.id);
        if (!config.activityChannels) {
            return message.reply({ embeds: [errorEmbed('Not Setup', 'No activity channels to remove.')] });
        }

        const channels = [];
        if (config.activityChannels.messageId) {
            const ch = message.guild.channels.cache.get(config.activityChannels.messageId);
            if (ch) { await ch.delete().catch(() => {}); channels.push('message leaderboard'); }
        }
        if (config.activityChannels.vcId) {
            const ch = message.guild.channels.cache.get(config.activityChannels.vcId);
            if (ch) { await ch.delete().catch(() => {}); channels.push('vc leaderboard'); }
        }

        updateGuildConfig(message.guild.id, { activityChannels: null });

        return message.reply({
            embeds: [successEmbed('Removed', `Deleted ${channels.join(' and ')}.`)]
        });
    }
};
