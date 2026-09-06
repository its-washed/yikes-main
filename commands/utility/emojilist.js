const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'emojilist', description: 'List all server emojis', usage: ',emojilist' },
    aliases: ['el'],
    cooldown: 5,
    async execute(message) {
        const emojis = message.guild.emojis.cache;
        if (emojis.size === 0) return message.reply({ embeds: [errorEmbed('No Emojis', 'This server has no emojis.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Emojis (${emojis.size})`, description: emojis.map(e => `${e} :${e.name}:`).join(' ').slice(0, 2000) })] });
    }
};
