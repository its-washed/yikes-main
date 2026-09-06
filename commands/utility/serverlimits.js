const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverlimits', description: 'Show server limits', usage: ',serverlimits' },
    aliases: ['limits'],
    cooldown: 5,
    async execute(message) {
        const g = message.guild;
        const level = g.premiumTier;
        const limits = { 0: { roles: 250, emojis: 50, bitrate: 96, upload: 25 }, 1: { roles: 250, emojis: 100, bitrate: 128, upload: 100 }, 2: { roles: 250, emojis: 150, bitrate: 256, upload: 250 }, 3: { roles: 250, emojis: 200, bitrate: 384, upload: 100 } };
        const l = limits[level];
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Server Limits', fields: [{ name: 'Roles', value: `${g.roles.cache.size}/${l.roles}`, inline: true }, { name: 'Emojis', value: `${g.emojis.cache.size}/${l.emojis}`, inline: true }, { name: 'Upload', value: `${l.upload}MB`, inline: true }, { name: 'Bitrate', value: `${l.bitrate}kbps`, inline: true }] })] });
    }
};
