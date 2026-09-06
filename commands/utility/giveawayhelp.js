const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'giveawayhelp', description: 'Giveaway help', usage: ',giveawayhelp' },
    aliases: ['gwhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0xffd700, title: 'Giveaway Help', description: '`,giveaway [time] [prize]`\n\nTime formats: `10m`, `1h`, `1d`, `1w`\n\nExample:\n`,giveaway 24h Nitro`' })] });
    }
};
