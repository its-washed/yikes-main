const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'verification', description: 'Show verification level', usage: ',verification' },
    aliases: ['verif'],
    cooldown: 3,
    async execute(message) {
        const levels = ['None', 'Low', 'Medium', 'High', 'Very High'];
        const level = levels[message.guild.verificationLevel] || 'Unknown';
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Verification Level', description: `**${level}**` })] });
    }
};
