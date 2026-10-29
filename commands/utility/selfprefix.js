const { warn, approve, paginate } = require('../../utils/context');
const { isPremium } = require('../../utils/premium');
const { isDeveloper } = require('../../utils/developer');
const { first, run, query } = require('../../utils/database');
const { sendCard } = require('../../utils/helpCard');

function hasPerks(userId) {
    return isPremium(userId) || isDeveloper(userId);
}

module.exports = {
    permission: "donator",
    data: { name: 'selfprefix', description: 'Manage your self prefix', usage: ',selfprefix <set|remove|leaderboard>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['set', 'remove', 'leaderboard'],
    subUsages: {
        set: ',selfprefix set ,',
        remove: ',selfprefix remove',
        leaderboard: ',selfprefix leaderboard'
    },
    execute: async (message) => {
        if (!hasPerks(message.author.id)) {
            return warn(message, 'This command is available to **donators** only');
        }
        const row = first('SELECT prefix FROM selfprefix WHERE user_id = ?', message.author.id);
        if (!row) return sendCard(message, module.exports);
        return message.reply({ content: `Your self prefix is \`${row.prefix}\`` });
    },
    subs: {
        set: {
            aliases: [],
            data: { name: 'selfprefix set', description: 'Set your self prefix', usage: ',selfprefix set ,' },
            execute: async (message, args) => {
                if (!hasPerks(message.author.id)) {
                    return warn(message, 'This command is available to **donators** only');
                }
                const prefix = args.join(' ').trim();
                if (!prefix) return warn(message, 'Self prefix is **too short**');
                if (prefix.length > 7) return warn(message, 'Prefix is too long!');
                const existing = first('SELECT 1 AS ok FROM selfprefix WHERE user_id = ?', message.author.id);
                if (existing) {
                    run('UPDATE selfprefix SET prefix = ? WHERE user_id = ?', prefix, message.author.id);
                } else {
                    run('INSERT INTO selfprefix (user_id, prefix) VALUES (?, ?)', message.author.id, prefix);
                }
                return approve(message, `Self prefix now **configured** as \`${prefix}\``);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'selfprefix remove', description: 'Remove your self prefix', usage: ',selfprefix remove' },
            execute: async (message) => {
                if (!hasPerks(message.author.id)) {
                    return warn(message, 'This command is available to **donators** only');
                }
                if (!first('SELECT 1 AS ok FROM selfprefix WHERE user_id = ?', message.author.id)) {
                    return warn(message, 'You do **not** have any self prefix');
                }
                run('DELETE FROM selfprefix WHERE user_id = ?', message.author.id);
                return approve(message, 'Self prefix removed');
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'selfprefix leaderboard', description: 'View the leaderboard of selfprefixes used for the bot', usage: ',selfprefix leaderboard' },
            execute: async (message) => {
                if (!hasPerks(message.author.id)) {
                    return warn(message, 'This command is available to **donators** only');
                }
                const rows = query('SELECT prefix, COUNT(*) as usage_count FROM selfprefix GROUP BY prefix ORDER BY usage_count DESC');
                if (!rows.length) return warn(message, 'No prefixes found');
                const lines = rows.map(row => `**${row.prefix}** - ${row.usage_count} uses`);
                return paginate(message, lines, 'Selfprefix Leaderboard', {
                    name: String(message.author),
                    icon_url: message.author.displayAvatarURL({ size: 256 })
                });
            }
        }
    }
};
