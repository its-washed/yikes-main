const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'mcserver', description: 'Check Minecraft server status', usage: ',mcserver [ip]' },
    aliases: ['mcs'],
    cooldown: 10,
    async execute(message, args) {
        const ip = args[0];
        if (!ip) return message.reply({ embeds: [errorEmbed('Missing IP', 'Usage: ,mcserver [ip]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `MC Server — ${ip}`, description: '*Minecraft server API not connected.*\n\nIntegrate with mcsrvstat.us for live data.' })] });
    }
};
