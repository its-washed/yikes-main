const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'slowmode', description: 'Set channel slowmode', usage: ',slowmode <seconds|off>' },
    aliases: ['sm'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        const val = args[0]?.toLowerCase();
        if (!val) return message.reply({ embeds: [errorEmbed('Usage', ',slowmode <seconds|off>')] });

        const seconds = val === 'off' ? 0 : parseInt(val);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            return message.reply({ embeds: [errorEmbed('Invalid', 'Seconds must be 0-21600 or `off`.')] });
        }

        await message.channel.setRateLimitPerUser(seconds, `Set by ${message.author.tag}`);
        return message.reply({ embeds: [successEmbed('Slowmode', seconds === 0 ? 'Slowmode disabled.' : `Set to **${seconds}** seconds.`)] });
    }
};
