const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const { resolveUser } = require('../../utils/moderation');

const GAMES = ['dice', 'coinflip', 'roulette', 'horserace', 'blackjack', 'ladder', 'mines', 'crash', 'higherlower', 'slots'];

function money(value) {
    const n = Number(value) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = {
    data: { name: 'economystats', description: 'Get your economy stats', usage: ',economystats [user]' },
    aliases: ['ecostats'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        let member = message.member;
        const mentioned = resolveUser(message, args[0]);
        if (mentioned) member = message.guild.members.cache.get(mentioned.id) || member;
        const user = member.user;
        const userId = member.id;

        const winnings = {};
        const losses = {};
        let totalWinnings = 0;
        let totalLosses = 0;
        for (const game of GAMES) {
            const win = first('SELECT COALESCE(SUM(amount), 0) AS total FROM economy_logs WHERE user_id = ? AND "action" = ? AND type = ?', userId, 'won', game);
            const loss = first('SELECT COALESCE(SUM(amount), 0) AS total FROM economy_logs WHERE user_id = ? AND "action" = ? AND type = ?', userId, 'lost', game);
            winnings[game] = Number(win ? win.total : 0);
            losses[game] = Number(loss ? loss.total : 0);
            totalWinnings += winnings[game];
            totalLosses += losses[game];
        }

        const fields = GAMES.map(game => ({
            name: game.charAt(0).toUpperCase() + game.slice(1),
            value: `${EMOJIS.ADD} ${money(winnings[game])}\n${EMOJIS.REMOVE} ${money(losses[game])}`,
            inline: true
        }));

        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                title: `${user.username}'s Economy Stats`,
                author: {
                    name: user.username,
                    iconURL: user.displayAvatarURL ? user.displayAvatarURL({ size: 256 }) : undefined
                },
                description: `**${EMOJIS.ADD} Total Winnings:** ${money(totalWinnings)}\n**${EMOJIS.REMOVE} Total Losses:** ${money(totalLosses)}`,
                fields
            })]
        });
    }
};
