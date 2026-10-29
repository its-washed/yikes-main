const { first, run } = require('./database');
const { warn } = require('./context');
const { COLORS } = require('./styles');

function record(winUserId, loseUserId, result, game) {
    if (result === 'win') {
        if (winUserId) {
            run(`INSERT INTO gamestats (user_id, game, wins, loses, ties) VALUES (?, ?, 1, 0, 0)
                 ON CONFLICT (user_id, game) DO UPDATE SET wins = COALESCE(gamestats.wins, 0) + 1, loses = COALESCE(gamestats.loses, 0), ties = COALESCE(gamestats.ties, 0)`,
                winUserId, game);
            if (loseUserId) {
                run(`INSERT INTO gamestats (user_id, game, wins, loses, ties) VALUES (?, ?, 0, 1, 0)
                     ON CONFLICT (user_id, game) DO UPDATE SET wins = COALESCE(gamestats.wins, 0), loses = COALESCE(gamestats.loses, 0) + 1, ties = COALESCE(gamestats.ties, 0)`,
                    loseUserId, game);
            }
        } else if (loseUserId) {
            run(`INSERT INTO gamestats (user_id, game, wins, loses, ties) VALUES (?, ?, 0, 1, 0)
                 ON CONFLICT (user_id, game) DO UPDATE SET wins = COALESCE(gamestats.wins, 0), loses = COALESCE(gamestats.loses, 0) + 1, ties = COALESCE(gamestats.ties, 0)`,
                loseUserId, game);
        }
    } else if (result === 'tie') {
        for (const id of [winUserId, loseUserId]) {
            if (!id) continue;
            run(`INSERT INTO gamestats (user_id, game, wins, loses, ties) VALUES (?, ?, 0, 0, 1)
                 ON CONFLICT (user_id, game) DO UPDATE SET wins = COALESCE(gamestats.wins, 0), loses = COALESCE(gamestats.loses, 0), ties = COALESCE(gamestats.ties, 0) + 1`,
                id, game);
        }
    }
}

function addPoints(userId, game, points) {
    run(`INSERT INTO gamestats (user_id, game, wins, loses, ties) VALUES (?, ?, ?, 0, 0)
         ON CONFLICT (user_id, game) DO UPDATE SET wins = COALESCE(gamestats.wins, 0) + ?`,
        userId, game, points, points);
}

function addLoss(userId, game, points) {
    run(`INSERT INTO gamestats (user_id, game, wins, loses, ties) VALUES (?, ?, 0, ?, 0)
         ON CONFLICT (user_id, game) DO UPDATE SET loses = COALESCE(gamestats.loses, 0) + ?`,
        userId, game, points, points);
}

function kd(wins, loses) {
    if (!loses) return Number(wins);
    return Math.round((wins / loses) * 100) / 100;
}

async function showStats(message, game, user) {
    const check = first('SELECT * FROM gamestats WHERE game = ? AND user_id = ?', game, user.id);
    if (!check) return warn(message, 'There are no stats recorded for this member');
    const wins = Number(check.wins) || 0;
    const loses = Number(check.loses) || 0;
    const ties = Number(check.ties) || 0;
    const ratio = `${kd(wins, loses).toFixed(2)} KD`;
    const embed = {
        color: COLORS.NEUTRAL,
        title: `Stats for ${game}`,
        author: { name: user.username, icon_url: user.displayAvatarURL({ size: 256 }) },
        fields: [
            { name: 'Wins', value: `> ${wins}`, inline: true },
            { name: 'Loses', value: `> ${loses}`, inline: true },
            { name: 'Ties', value: `> ${ties}`, inline: true },
            { name: 'Total', value: `> ${wins + loses + ties}`, inline: true },
            { name: 'K/D Ratio', value: `> ${ratio}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }
        ]
    };
    return message.reply({ embeds: [embed] });
}

async function showLeaderboard(message, game) {
    const rows = require('./database').query('SELECT * FROM gamestats WHERE game = ? ORDER BY wins DESC', game);
    if (!rows.length) {
        return warn(message, 'There are no stats recorded for this game.\n> If you are using a custom alias, try the normal command.');
    }
    const { paginate } = require('./context');
    const lines = rows.map((row, index) => {
        const user = message.client.users.cache.get(String(row.user_id));
        const name = user ? `${user}` : `<@${row.user_id}>`;
        const wins = Number(row.wins) || 0;
        const loses = Number(row.loses) || 0;
        return `\`${index + 1}.\` ${name} — **Wins:** ${wins}・**Loses:** ${loses}・${kd(wins, loses).toFixed(2)} KD`;
    });
    return paginate(message, lines, `Leaderboard for ${game}`, {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    }, { perPage: 9 });
}

module.exports = { record, addPoints, addLoss, kd, showStats, showLeaderboard };
