const { sendCard } = require('../../utils/helpCard');
const { warn, approve } = require('../../utils/context');
const { run, first, query } = require('../../utils/database');
const { confirm } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const { EMOJIS, COLORS } = require('../../utils/styles');
const { createEmbed } = require('../../utils/embeds');
const { paginate } = require('../../utils/context');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'quest', description: 'Manage your quests', usage: ',quest <subcommand>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['start', 'status', 'complete', 'stop', 'leaderboard'],
    subUsages: {
        start: ',quest start <easy|medium|hard>',
        status: ',quest status',
        complete: ',quest complete',
        stop: ',quest stop',
        leaderboard: ',quest leaderboard'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        start: {
            data: { name: 'quest start', description: 'Start a quest', usage: ',quest start <difficulty>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const difficulty = String(args[0] || '').toLowerCase();
                if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                    return warn(message, 'Invalid difficulty. Choose between `easy`, `medium` or `hard`');
                }
                const row = E.ensureAccount(userId);
                const now = Date.now() / 1000;
                if (row.quest && row.quest > now) {
                    return warn(message, `You recently stopped a quest\n> Available <t:${Math.floor(row.quest)}:R>`);
                }
                if (E.getUserQuest(userId)) return warn(message, 'You have an active quest.');
                const randomQuest = E.getRandomQuest(difficulty);
                if (!randomQuest) return warn(message, "Your quest can't be found in the database");
                run('INSERT OR REPLACE INTO quests_user (user_id, id, difficult, amount, completed) VALUES (?, ?, ?, 0, 0)',
                    userId, randomQuest.id, randomQuest.difficult);
                return approve(message, `Successfully started the quest **${randomQuest.name}**, for completion you gain **${E.humanize(randomQuest.earnings)}** \ud83d\udcb5`);
            }
        },
        status: {
            data: { name: 'quest status', description: 'View the status of your quest', usage: ',quest status' },
            aliases: ['info'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userQuest = E.getUserQuest(message.author.id);
                if (!userQuest) return warn(message, "You don't have an active quest.");
                const quest = E.getQuest(userQuest.id);
                if (!quest) return warn(message, "Your quest can't be found in the database");
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.NEUTRAL,
                        title: quest.name,
                        fields: [
                            { name: 'Mode', value: String(quest.mode || '').replace(/\b\w/g, c => c.toUpperCase()), inline: true },
                            { name: 'Difficulty', value: String(quest.difficult || '').replace(/\b\w/g, c => c.toUpperCase()), inline: true },
                            { name: 'Progress', value: `${(userQuest.amount || 0).toLocaleString('en-US')}/${(quest.amount || 0).toLocaleString('en-US')}`, inline: true }
                        ]
                    })]
                });
            }
        },
        complete: {
            data: { name: 'quest complete', description: 'Complete your quest', usage: ',quest complete' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const userQuest = E.getUserQuest(userId);
                if (!userQuest) return warn(message, "You don't have an active quest.");
                const quest = E.getQuest(userQuest.id);
                if (!quest) return warn(message, "Your quest can't be found in the database");
                if ((userQuest.amount || 0) < (quest.amount || 0)) return warn(message, 'You have not completed the quest.');
                run('UPDATE quests_user SET completed = 1 WHERE user_id = ? AND id = ?', userId, quest.id);
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', quest.earnings, userId);
                E.logging(userId, quest.earnings, 'collect', 'quest');
                return approve(message, `Successfully completed the quest **${quest.name}** and gained **${E.humanize(quest.earnings)}** \ud83d\udcb5`);
            }
        },
        stop: {
            data: { name: 'quest stop', description: 'Stop your quest', usage: ',quest stop' },
            aliases: ['delete'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const userQuest = E.getUserQuest(userId);
                if (!userQuest) return warn(message, "You don't have an active quest.");
                const quest = E.getQuest(userQuest.id);
                if (!quest) return warn(message, "Your quest can't be found in the database");
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **stop** your quest?\n> You have to wait **15 minutes** to start a new one!`,
                    async (i) => {
                        run('DELETE FROM quests_user WHERE user_id = ? AND id = ?', userId, quest.id);
                        run('UPDATE economy SET quest = ? WHERE user_id = ?', Math.floor(Date.now() / 1000 + 900), userId);
                        await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Successfully cancelled the quest **${quest.name}**` }], components: [] });
                    },
                    async (i) => {
                        await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Quest deletion got canceled` }], components: [] });
                    });
            }
        },
        leaderboard: {
            data: { name: 'quest leaderboard', description: 'View the quest leaderboard', usage: ',quest leaderboard' },
            aliases: ['lb'],
            execute: async (message, args, client) => {
                const leaderboard = query('SELECT user_id, COUNT(*) AS completed_quests FROM quests_user WHERE completed = 1 GROUP BY user_id ORDER BY completed_quests DESC');
                if (!leaderboard.length) return warn(message, 'No entries found in the database.');
                const lines = leaderboard.map(entry => `**<@${entry.user_id}>** - ${entry.completed_quests} completed quests`);
                return paginate(message, lines, 'Quest Leaderboard', { name: message.guild.name });
            }
        }
    }
};
