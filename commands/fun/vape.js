const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { first, run, query } = require('../../utils/database');

const cooldowns = new Map();

function onCooldown(guildId, userId, key, seconds) {
    const id = `${key}-${guildId}-${userId}`;
    const now = Date.now();
    const until = cooldowns.get(id) || 0;
    if (until > now) return true;
    cooldowns.set(id, now + seconds * 1000);
    return false;
}

async function hit(message) {
    if (onCooldown(message.guild.id, message.author.id, 'vape-hit', 30)) {
        return warn(message, 'You are on cooldown for hitting the vape');
    }
    const check = first('SELECT * FROM vape WHERE guild_id = ?', message.guild.id);
    if (check && String(check.user_id) !== String(message.author.id)) {
        const holder = message.guild.members.cache.get(String(check.user_id));
        if (holder) {
            return warn(message, `You don't have the **vape**! Steal it from ${holder}`);
        }
    }
    if (check) {
        run('UPDATE vape SET hits = hits + 1 WHERE guild_id = ?', message.guild.id);
    } else {
        run('INSERT INTO vape (guild_id, user_id, hits) VALUES (?, ?, ?)', message.guild.id, message.author.id, 1);
    }
    const row = first('SELECT hits FROM vape WHERE guild_id = ?', message.guild.id);
    return message.reply({
        embeds: [{
            color: COLORS.SUCCESS,
            description: `${EMOJIS.APPROVE} ${message.author}: Hit the **vape**! The server now has \`${row.hits}\` hits`
        }]
    });
}

module.exports = {
    data: { name: 'vape', description: 'Hit the vape', usage: ',vape [hit|steal|hits|leaderboard]' },
    aliases: ['juul'],
    cooldown: 3,
    subcommands: ['hit', 'steal', 'hits', 'leaderboard'],
    subUsages: {
        hit: ',vape hit',
        steal: ',vape steal',
        hits: ',vape hits',
        leaderboard: ',vape leaderboard'
    },

    async execute(message, args, client, config) {
        if (args.length === 0) return hit(message);
        return sendCard(message, module.exports);
    },

    subs: {
        hit: {
            aliases: ['smoke'],
            data: { name: 'vape hit', description: 'Hit the vape', usage: ',vape hit' },
            async execute(message, args, client, config) {
                return hit(message);
            }
        },

        steal: {
            aliases: ['take'],
            data: { name: 'vape steal', description: 'Steal the vape from a member', usage: ',vape steal' },
            async execute(message, args, client, config) {
                if (onCooldown(message.guild.id, message.author.id, 'vape-steal', 30)) {
                    return warn(message, 'You are on cooldown for stealing the vape');
                }
                const check = first('SELECT * FROM vape WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, 'No vape record found for this guild.');
                if (String(check.user_id) === String(message.author.id)) return warn(message, 'You already have the **vape**!');
                run('UPDATE vape SET user_id = ? WHERE guild_id = ?', message.author.id, message.guild.id);
                const previous = message.guild.members.cache.get(String(check.user_id));
                if (previous) return approve(message, `Stole the **vape** from ${previous}`);
                return approve(message, 'Found the **vape** somewhere and took it');
            }
        },

        hits: {
            aliases: [],
            data: { name: 'vape hits', description: 'View the amount of hits in the server', usage: ',vape hits' },
            async execute(message, args, client, config) {
                const result = first('SELECT hits FROM vape WHERE guild_id = ?', message.guild.id);
                if (!result) return warn(message, 'There are no **vape hits** in this server');
                return approve(message, `This server has \`${result.hits}\` **vape hits**`);
            }
        },

        leaderboard: {
            aliases: ['lb'],
            data: { name: 'vape leaderboard', description: 'Global leaderboard for vape hits across all servers', usage: ',vape leaderboard' },
            async execute(message, args, client, config) {
                const results = query('SELECT guild_id, hits FROM vape').sort((a, b) => (Number(b.hits) || 0) - (Number(a.hits) || 0));
                if (!results.length) return warn(message, 'There are no **vape hits** recorded in any server.');
                const lines = [];
                for (const row of results) {
                    const guild = message.client.guilds.cache.get(String(row.guild_id));
                    if (guild) lines.push(`**${guild.name}** has \`${row.hits}\` vape hits`);
                }
                if (!lines.length) return warn(message, 'There are no **vape hits** recorded in any server.');
                return paginate(message, lines, 'Global Vape Leaderboard', {
                    name: message.author.username,
                    icon_url: message.author.displayAvatarURL({ size: 256 })
                });
            }
        }
    }
};
