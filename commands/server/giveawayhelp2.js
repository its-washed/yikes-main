const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'giveawayhelp2', description: 'Giveaway management help', usage: ',giveawayhelp2' },
    aliases: ['gwhelp2'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0xffd700, title: 'Giveaway Help', description: '`,giveaway [time] [prize]`\n`,creategiveaway [time] [prize]`\n`,reroll [messageId]`\n\nTime formats: `10m`, `1h`, `1d`, `1w`' })] });
    }
};
