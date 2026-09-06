const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverfeatures', description: 'Show server features', usage: ',serverfeatures' },
    aliases: ['features'],
    cooldown: 5,
    async execute(message) {
        const features = message.guild.features;
        if (features.length === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: 'No special features.' })] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Server Features', description: features.map(f => `\`${f}\``).join(', ').replace(/_/g, ' ') })] });
    }
};
