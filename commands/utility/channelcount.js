const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'channelcount', description: 'Count channels', usage: ',channelcount' },
    aliases: ['cc'],
    cooldown: 5,
    async execute(message) {
        const text = message.guild.channels.cache.filter(c => c.type === 0).size;
        const voice = message.guild.channels.cache.filter(c => c.type === 2).size;
        const cats = message.guild.channels.cache.filter(c => c.type === 4).size;
        const total = message.guild.channels.cache.size;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Channel Count', fields: [{ name: 'Text', value: `${text}`, inline: true }, { name: 'Voice', value: `${voice}`, inline: true }, { name: 'Categories', value: `${cats}`, inline: true }, { name: 'Total', value: `${total}`, inline: true }] })] });
    }
};
