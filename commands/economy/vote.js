const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { query, first, run } = require('../../utils/database');
const { paginate, warn, approve } = require('../../utils/context');
const { createEmbed, COLORS, permissionDenied } = require('../../utils/embeds');
const { prefix } = require('../../utils/moderation');
const { EMOJIS } = require('../../utils/styles');
const { ensureEconomy } = require('../../utils/predicates');
const { cleanHumanize, logging, getUserCompany } = require('../../utils/econ');
const { isDeveloper } = require('../../utils/developer');

const VOTE_COLOR = 0xFF819F;
const BOT_ID = '1242930981967757452';
const TOPGG_TOKEN = process.env.TOPGG_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib3QiOiJ0cnVlIiwiaWQiOiIxMjQyOTMwOTgxOTY3NzU3NDUyIiwiaWF0IjoiMTc0NTM4OTIxMiJ9.twqlMYKpxHJ84sAaXZq9M-BL5lx-m-0wmQdggQIzVGI';
const voteLink = client => `https://top.gg/bot/${client ? client.user.id : BOT_ID}/vote`;

function voteReward() {
    const row = first('SELECT vote FROM economy_config WHERE active = TRUE');
    const amount = row && row.vote !== null && row.vote !== undefined ? Number(row.vote) : 2500;
    return Number.isFinite(amount) ? amount : 2500;
}

async function processVote(user) {
    const amount = voteReward();
    const company = getUserCompany(user.id);
    if (company) {
        const voters = first('SELECT 1 AS ok FROM company_voters WHERE company_id = ? AND user_id = ?', company.id, user.id);
        if (voters) {
            run('UPDATE company_voters SET votes = votes + 1 WHERE company_id = ? AND user_id = ?', company.id, user.id);
        } else {
            run('INSERT INTO company_voters (user_id, company_id, votes) VALUES (?, ?, 1)', user.id, company.id);
        }
        run('UPDATE company SET votes = votes + 1 WHERE id = ?', company.id);
    }

    const balance = first('SELECT cash FROM economy WHERE user_id = ?', user.id);
    const voteData = first('SELECT user_id FROM votes WHERE user_id = ?', user.id);
    const voteUntil = Date.now() / 1000 + 43200;

    if (!balance) {
        run('INSERT INTO economy (user_id, cash) VALUES (?, ?)', user.id, amount);
    } else {
        run('UPDATE economy SET cash = ? WHERE user_id = ?', Number(balance.cash || 0) + amount, user.id);
    }

    if (!voteData) {
        run('INSERT INTO votes (user_id, vote_until, vote_count) VALUES (?, ?, 1)', user.id, voteUntil);
    } else {
        run('UPDATE votes SET vote_until = ?, vote_count = vote_count + 1 WHERE user_id = ?', voteUntil, user.id);
    }
}

function formatCd(cd, isTopgg, client) {
    const available = isTopgg ? `[\`Available\`](${voteLink(client)})` : '`Available`';
    if (cd === null || cd === undefined || cd === '') return available;
    let when = null;
    const numeric = Number(cd);
    if (Number.isFinite(numeric) && String(cd).trim() !== '') {
        when = new Date(numeric * 1000);
    } else {
        when = new Date(String(cd).replace(' ', 'T') + 'Z');
    }
    if (Number.isNaN(when.getTime())) return available;
    if (Date.now() > when.getTime()) return available;
    return `<t:${Math.floor(when.getTime() / 1000)}:R>`;
}

function voteButton(client, label) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(voteLink(client))
    );
}

module.exports = {
    data: { name: 'vote', description: 'Command that sends the vote link for top.gg', usage: ',vote <claim|leaderboard|remind|add>' },
    aliases: [],
    subcommands: ['claim', 'leaderboard', 'remind', 'add'],
    subUsages: {
        claim: ',vote claim',
        leaderboard: ',vote leaderboard',
        remind: ',vote remind',
        add: ',vote add <user>'
    },

    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const result = first('SELECT vote_until, vote_count FROM votes WHERE user_id = ?', message.author.id);
        const cooldown = result ? result.vote_until : null;
        const count = result && result.vote_count !== null && result.vote_count !== undefined ? Number(result.vote_count) : 0;
        const cooldownText = formatCd(cooldown, true, client);
        const voteAmount = cleanHumanize(voteReward());

        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description: `**Vote for ${client.user.username} on** [**top.gg**](${voteLink(client)})`,
            fields: [
                { name: 'Rewards', value: `> ${voteAmount} 💵 & Donator (12h)`, inline: true },
                { name: 'Votes', value: `> ${count}`, inline: true },
                { name: 'Cooldown', value: `> ${cooldownText}`, inline: true }
            ],
            footer: { text: `You need to run ${prefix(message)}vote claim to claim your reward` }
        });

        return message.reply({ embeds: [embed], components: [voteButton(client, 'Vote here')] });
    },

    subs: {
        claim: {
            aliases: [],
            data: { name: 'vote claim', description: 'Claim the vote reward', usage: ',vote claim' },
            cooldown: 10,
            async execute(message, args, client) {
                const result = await fetch(`https://top.gg/api/bots/${client.user.id}/check?userId=${message.author.id}`, {
                    headers: { Authorization: TOPGG_TOKEN }
                }).then(res => res.json()).catch(() => null);

                if (result === null || result === undefined) {
                    return warn(message, 'Top.gg API running slow, please try again later');
                }

                try {
                    if (Number(result.voted) === 0) {
                        return warn(message, `You have not voted for ${client.user.username} on [**top.gg**](${voteLink(client)})`);
                    }
                    if (Number(result.voted) === 1) {
                        const check = first('SELECT vote_until FROM votes WHERE user_id = ?', message.author.id);
                        if (check !== null && check !== undefined && check.vote_until !== null && check.vote_until !== undefined) {
                            if (Number(check.vote_until) > Date.now() / 1000) {
                                return warn(message, 'You have already claimed your vote reward');
                            }
                        } else {
                            run('INSERT INTO votes (user_id, vote_until, vote_count) VALUES (?, ?, 0)', message.author.id, Date.now() / 1000);
                        }
                    }
                } catch (err) {
                    return warn(message, 'Top.gg API running slow, please try again later');
                }

                await processVote(message.author);
                const winnings = voteReward();
                const voteAmount = cleanHumanize(winnings);
                const embed = createEmbed({
                    color: VOTE_COLOR,
                    description: `${EMOJIS.HEART} Thank you for voting! You have received **${voteAmount} 💵**\n${EMOJIS.REPLY} You gain access to donator perks for 12 hours`
                });
                logging(message.author.id, winnings, 'collect', 'vote');
                return message.reply({ embeds: [embed], components: [voteButton(client, 'Vote on Top.gg')] });
            }
        },

        leaderboard: {
            aliases: [],
            data: { name: 'vote leaderboard', description: 'Leaderboard for top.gg votes', usage: ',vote leaderboard' },
            async execute(message, args, client) {
                const votes = query('SELECT user_id, vote_count FROM votes WHERE vote_count > 0 ORDER BY vote_count DESC');
                const total = first('SELECT SUM(vote_count) AS total FROM votes');
                const toShow = [];
                for (const vote of votes) {
                    const user = client.users.cache.get(String(vote.user_id)) || await client.users.fetch(String(vote.user_id)).catch(() => null);
                    if (user) toShow.push(`**${user.tag}** - Votes: ${vote.vote_count}`);
                }
                return paginate(message, toShow, `Top.gg Votes (${total && total.total !== null ? total.total : 0})`, {
                    name: message.author.tag,
                    icon_url: message.author.avatar ? message.author.avatarURL({ size: 256 }) : undefined
                });
            }
        },

        remind: {
            aliases: [],
            data: { name: 'vote remind', description: "Remind the user to vote for Evelina", usage: ',vote remind' },
            async execute(message) {
                const check = first('SELECT vote_until, vote_reminder FROM votes WHERE user_id = ?', message.author.id);
                if (check === null || check === undefined) {
                    run('INSERT INTO votes (user_id, vote_until, vote_count, vote_reminder) VALUES (?, NULL, 0, TRUE)', message.author.id);
                    return approve(message, `You will now receive a reminder to vote for ${message.client.user.username}`);
                }
                if (check.vote_reminder === true || check.vote_reminder === 1) {
                    return warn(message, `You are already receiving reminders to vote for ${message.client.user.username}`);
                }
                run('UPDATE votes SET vote_reminder = TRUE WHERE user_id = ?', message.author.id);
                return approve(message, `You will now receive a reminder to vote for ${message.client.user.username}`);
            }
        },

        add: {
            aliases: [],
            data: { name: 'vote add', description: 'Add a vote to a user', usage: ',vote add <user>' },
            async execute(message, args, client) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
                }
                const mentioned = message.mentions.users.first();
                const id = args[0] ? String(args[0]).replace(/[<@!>]/g, '') : null;
                const target = mentioned || (id && /^\d{17,20}$/.test(id) ? await client.users.fetch(id).catch(() => null) : null);
                if (!target) return warn(message, 'Usage: `vote add <user>`');
                await processVote(target);
                return approve(message, `Added a vote to ${target}`);
            }
        }
    }
};
