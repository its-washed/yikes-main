const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { prefix } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');

const GAMES = [
    ['Dice', 'dice'], ['Coinflip', 'coinflip'], ['Roulette', 'roulette'],
    ['Blackjack', 'blackjack'], ['Ladder', 'ladder'], ['Mines', 'mines'],
    ['Crash', 'crash'], ['HigherLower', 'higherlower'], ['Slots', 'slots']
];

module.exports = {
    data: { name: 'minigames', description: 'View all available economy games', usage: ',minigames' },
    aliases: ['games'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;
        const p = prefix(message);
        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                title: 'Economy Games',
                fields: GAMES.map(([name, cmd]) => ({
                    name,
                    value: `${EMOJIS.REPLY} \`${p}${cmd}\``,
                    inline: true
                }))
            })]
        });
    }
};
