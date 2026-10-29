const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needSupporter } = require('../../utils/predicates');
const { addRole } = require('../../utils/manage');
const { sendCard } = require('../../utils/helpCard');
const { EMOJIS } = require('../../utils/styles');

const BUG_HUNTER_ROLES = [
    { count: 3, role: '1243745562197626982' },
    { count: 5, role: '1300196517969137754' }
];

function randomCase() {
    const source = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += source[Math.floor(Math.random() * source.length)];
    return out;
}

module.exports = {
    permission: "bot supporter",
    data: { name: 'bug', description: 'Bug Hunter commands', usage: ',bug <add|remove|list|leaderboard>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'leaderboard'],
    subUsages: {
        add: ',bug add <member> <reason>',
        remove: ',bug remove <case>',
        list: ',bug list <member>',
        leaderboard: ',bug leaderboard'
    },
    execute: async (message, args, client) => {
        if (!await needSupporter(message)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'bug add', description: 'Add a bug report to a member', usage: ',bug add <member> <reason>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const member = message.mentions.users.first();
                const reason = args.slice(1).join(' ').trim();
                if (!member || !reason) return warn(message, 'Usage: `bug add <member> <reason>`');
                const caseId = randomCase();
                run('INSERT INTO bugreports (case_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
                    caseId, member.id, message.author.id, reason, Date.now() / 1000);
                const countRow = first('SELECT COUNT(*) AS count FROM bugreports WHERE user_id = ?', member.id);
                const count = countRow ? countRow.count : 0;
                for (const entry of BUG_HUNTER_ROLES) {
                    if (count >= entry.count) await addRole(client, member, entry.role);
                }
                return approve(message, `Added a bug to ${member} (\`#${count}\`) - **${reason}**`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'bug remove', description: 'Remove a bug report from a member', usage: ',bug remove <case>' },
            execute: async (message, args) => {
                if (!await needSupporter(message)) return;
                const caseId = args[0];
                if (!caseId) return warn(message, 'Usage: `bug remove <case>`');
                const check = first('SELECT * FROM bugreports WHERE case_id = ?', caseId);
                if (!check) return warn(message, `Bug report \`${caseId}\` doesn't exist`);
                run('DELETE FROM bugreports WHERE case_id = ?', caseId);
                return approve(message, `Removed a bug from <@${check.user_id}> with ID \`${caseId}\``);
            }
        },
        list: {
            aliases: [],
            data: { name: 'bug list', description: 'List all bugs from a given member', usage: ',bug list <member>' },
            execute: async (message, args) => {
                if (!await needSupporter(message)) return;
                const member = message.mentions.users.first();
                if (!member) return warn(message, 'Usage: `bug list <member>`');
                const rows = query('SELECT * FROM bugreports WHERE user_id = ? ORDER BY timestamp DESC', member.id);
                if (!rows.length) return warn(message, `Couldn't find any bug that got reported from ${member}`);
                const lines = rows.map(r => `**${r.reason}** - <t:${Math.floor(r.timestamp)}:R>\n ${EMOJIS.REPLY} \`${r.case_id}\``);
                return paginate(message, lines, 'Bug Reports',
                    { name: message.author.username, icon_url: message.author.displayAvatarURL() }, { perPage: 5 });
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'bug leaderboard', description: 'Display a leaderboard of members with the most bug reports', usage: ',bug leaderboard' },
            execute: async (message) => {
                if (!await needSupporter(message)) return;
                const rows = query('SELECT user_id, COUNT(*) AS bug_count FROM bugreports GROUP BY user_id ORDER BY bug_count DESC');
                if (!rows.length) return warn(message, 'No bug reports found');
                const lines = rows.map(r => `<@${r.user_id}> repoted \`${r.bug_count}\` bugs`);
                return paginate(message, lines, 'Bug Report Leaderboard',
                    { name: message.author.username, icon_url: message.author.displayAvatarURL() });
            }
        }
    }
};
