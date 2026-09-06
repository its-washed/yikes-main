const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverage', description: 'Show server age', usage: ',serverage' },
    aliases: ['created'],
    cooldown: 3,
    async execute(message) {
        const created = message.guild.createdTimestamp;
        const days = Math.floor((Date.now() - created) / 86400000);
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        const remaining = days % 30;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Server Age', fields: [{ name: 'Created', value: `<t:${Math.floor(created / 1000)}:D>`, inline: true }, { name: 'Age', value: `${years}y ${months}m ${remaining}d`, inline: true }, { name: 'Total Days', value: `${days}`, inline: true }] })] });
    }
};
