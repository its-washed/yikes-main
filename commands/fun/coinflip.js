const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'coinflip', description: 'Flip a coin', usage: ',coinflip' },
    aliases: ['flip', 'coin'],
    cooldown: 2,
    async execute(message) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '🪙';
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Coin Flip', description: `${emoji} **${result}!**` })] });
    }
};
