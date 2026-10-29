const { ActionRowBuilder, ButtonBuilder, ButtonStyle, version: discordjsVersion, PermissionFlagsBits } = require('discord.js');
const { createEmbed, PRESERVE } = require('../../utils/embeds');
const { getStats } = require('../../utils/botStats');
const { showStats, showLeaderboard } = require('../../utils/gameStats');
const { warn } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');

const SUPPORT_URL = 'https://discord.gg/yikes';
const GITHUB_URL = 'https://github.com/its-washed/yikes';

function uptimeText(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${days}d ${hours}h ${mins}m`;
}

const n = value => Number(value).toLocaleString('en-US');

module.exports = {
    data: { name: 'stats', description: "Check a member's stats for a certain game", usage: ',stats [tictactoe|blacktea|rockpaperscissors|flags|leaderboard]' },
    aliases: [],
    cooldown: 5,
    subcommands: ['tictactoe', 'blacktea', 'rockpaperscissors', 'flags', 'leaderboard'],
    subUsages: {
        tictactoe: ',stats tictactoe [user]',
        blacktea: ',stats blacktea [user]',
        rockpaperscissors: ',stats rockpaperscissors [user]',
        flags: ',stats flags [user]',
        leaderboard: ',stats leaderboard <game>'
    },

    async execute(message, args, client) {
        const stats = await getStats(client);
        const memory = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`;
        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const embed = createEmbed({
            color: 0x729bb0,
            timestamp: false,
            author: {
                name: client.user.username,
                iconURL: client.user.displayAvatarURL({ size: 256 })
            },
            description: [
                `Live runtime and performance stats for **[${client.user.username}](https://itswashed.lol)**`,
                `Used by **${n(stats.members)}** members in **${n(stats.guilds)}** servers on **${n(stats.shards)}** shards`
            ].join('\n'),
            fields: [
                {
                    name: 'Network',
                    value: `**Servers:** ${n(stats.guilds)}\n**Shards:** ${n(stats.shards)}\n**Channels:** ${n(stats.channels)}`,
                    inline: true
                },
                {
                    name: 'Runtime',
                    value: `**Node.js:** ${process.version}\n**discord.js:** ${discordjsVersion}\n**Memory:** ${memory}`,
                    inline: true
                },
                {
                    name: 'Performance',
                    value: `**Ping:** ${client.ws.ping}ms\n**Uptime:** ${uptimeText(client.uptime)}\n**Commands:** ${n(client.commands.size)}`,
                    inline: true
                }
            ]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(invite),
            new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(SUPPORT_URL),
            new ButtonBuilder().setLabel('GitHub').setStyle(ButtonStyle.Link).setURL(GITHUB_URL)
        );

        return message.reply({ embeds: [embed], components: [row], [PRESERVE]: true });
    },

    subs: {
        tictactoe: {
            aliases: ['ttt'],
            data: { name: 'stats tictactoe', description: "View a member's stats for tictactoe", usage: 'stats tictactoe [user]' },
            async execute(message, args, client, config) {
                return gameStatsExecute(message, args, 'tictactoe');
            }
        },
        blacktea: {
            aliases: ['bt'],
            data: { name: 'stats blacktea', description: "View a member's stats for blacktea", usage: 'stats blacktea [user]' },
            async execute(message, args, client, config) {
                return gameStatsExecute(message, args, 'blacktea');
            }
        },
        rockpaperscissors: {
            aliases: ['rps'],
            data: { name: 'stats rockpaperscissors', description: "View a member's stats for rockpaperscissors", usage: 'stats rockpaperscissors [user]' },
            async execute(message, args, client, config) {
                return gameStatsExecute(message, args, 'rockpaperscissors');
            }
        },
        flags: {
            aliases: [],
            data: { name: 'stats flags', description: "View a member's stats for flags", usage: 'stats flags [user]' },
            async execute(message, args, client, config) {
                return gameStatsExecute(message, args, 'flags');
            }
        },
        leaderboard: {
            aliases: ['lb', 'top'],
            data: { name: 'stats leaderboard', description: "Get the leaderboard for a specific game", usage: 'stats leaderboard <game>' },
            async execute(message, args, client, config) {
                const game = String(args[0] || '').toLowerCase();
                if (!game) return warn(message, 'You must provide a game\n> Usage: `stats leaderboard <game>`');
                const aliases = { ttt: 'tictactoe', bt: 'blacktea', rps: 'rockpaperscissors' };
                const resolved = aliases[game] || game;
                return showLeaderboard(message, resolved);
            }
        }
    }
};

async function gameStatsExecute(message, args, game) {
    let user = message.author;
    if (args[0]) {
        const id = String(args[0]).replace(/[<@!>]/g, '');
        if (/^\d{17,20}$/.test(id)) {
            user = message.client.users.cache.get(id) || await message.client.users.fetch(id).catch(() => message.author);
        }
    }
    return showStats(message, game, user);
}
