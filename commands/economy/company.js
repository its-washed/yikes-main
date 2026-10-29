const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendCard } = require('../../utils/helpCard');
const { warn, approve } = require('../../utils/context');
const { run, first, query } = require('../../utils/database');
const { confirm } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const { EMOJIS, COLORS } = require('../../utils/styles');
const { createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const E = require('../../utils/econ');

const RANK_NAMES = { 4: 'CEO', 3: 'Manager', 2: 'Senior', 1: 'Employee' };

function parseAmountArg(token) {
    return E.parseAmount(token, Number.MAX_SAFE_INTEGER);
}

function validTag(tag) {
    return /^[A-Za-z0-9]{2,6}$/.test(String(tag || ''));
}

function validName(name) {
    const text = String(name || '').trim();
    return text.length >= 2 && text.length <= 32;
}

async function pagesFor(message, pages) {
    if (!pages.length) return warn(message, 'No entries found.');
    const paginator = new Paginator(pages, { userId: message.author.id });
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
    if (pages.length > 1) await paginator.start(message.channel, sent);
    return sent;
}

function companyInfoEmbed(client, company) {
    const roles = E.parseRoles(company);
    const members = E.parseMembers(company);
    const limit = E.getLevelInfo(company.level);
    let networth = 0;
    for (const memberId of members) networth += E.getUserNetworth(memberId);
    const votesTotal = first('SELECT COALESCE(SUM(votes), 0) AS total FROM company_voters WHERE company_id = ?', company.id);
    const project = E.activeProject(company.id);

    const embed = createEmbed({
        color: COLORS.NEUTRAL,
        title: `${company.name} | ${company.tag}`,
        description: company.description || '',
        thumbnail: company.icon || undefined,
        fields: [
            { name: '\ud83d\udc51 CEO', value: `<@${company.ceo}>`, inline: true },
            { name: '\ud83d\udc64 Members', value: `${members.length}/${limit.members}`, inline: true },
            { name: '\ud83d\udcc5 Since', value: company.created ? `<t:${Math.floor(company.created)}:f>` : 'Unknown', inline: true },
            { name: '\ud83c\udfc5 Rank', value: `#${query('SELECT name FROM company ORDER BY reputation DESC').findIndex(c => c.name === company.name) + 1}`, inline: true },
            { name: '\u2b50 Reputation', value: String(company.reputation || 0), inline: true },
            { name: '\ud83c\udfe2 Stage', value: String(company.level || 1), inline: true },
            { name: '\ud83d\udcb0 Vault', value: `${E.humanize(company.vault || 0)} \ud83d\udcb5`, inline: true },
            { name: '\ud83d\udcc8 Networth', value: `${E.humanize(networth)} \ud83d\udcb5`, inline: true },
            { name: '\u2b06\ufe0f Votes / Total Votes', value: `${company.votes || 0} / ${votesTotal ? votesTotal.total : 0}`, inline: true }
        ]
    });
    if (project) {
        const projectInfo = first('SELECT * FROM company_projects WHERE name = ?', project.project_name);
        if (projectInfo) {
            embed.addFields({
                name: `\ud83d\ude80 Project (${project.project_name})`,
                value: `**Money:** ${E.humanize(project.money || 0)}/${E.humanize(projectInfo.cost)} \ud83d\udcb5\n**Votes:** ${company.votes || 0}/${projectInfo.votes}`,
                inline: false
            });
        }
    }
    return embed;
}

module.exports = {
    data: { name: 'company', description: 'Manage your company', usage: ',company <subcommand>' },
    aliases: ['comp'],
    cooldown: 5,
    subcommands: ['create', 'delete', 'transfer', 'info', 'userinfo', 'list', 'members', 'name', 'description', 'tag', 'icon', 'upgrade', 'leaderboard', 'privacy', 'join', 'leave', 'kick', 'uprank', 'downrank', 'requests', 'request', 'invite', 'uninvite', 'vault', 'project'],
    subUsages: {
        create: ',company create <tag> <name>',
        delete: ',company delete',
        transfer: ',company transfer <user>',
        info: ',company info [name|tag]',
        userinfo: ',company userinfo [user]',
        list: ',company list',
        members: ',company members <stats|list>',
        name: ',company name <name>',
        description: ',company description <text>',
        tag: ',company tag <tag>',
        icon: ',company icon [attachment|link]',
        upgrade: ',company upgrade',
        leaderboard: ',company leaderboard <reputation|votes|vault|networth>',
        privacy: ',company privacy <public|request|closed>',
        join: ',company join <name>',
        leave: ',company leave',
        kick: ',company kick <user>',
        uprank: ',company uprank <user>',
        downrank: ',company downrank <user>',
        requests: ',company requests',
        request: ',company request <name> <text>',
        invite: ',company invite <user>',
        uninvite: ',company uninvite <user>',
        vault: ',company vault <deposit|withdraw|bonus|limit|logs>',
        project: ',company project <start|cancel|status|contribute|participants|complete|collect|list>'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        create: {
            data: { name: 'company create', description: 'Create a company', usage: ',company create <tag> <name>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const tag = args[0];
                const name = args.slice(1).join(' ').trim();
                if (!validTag(tag)) return warn(message, 'You need to provide a valid company tag (2-6 letters/numbers).\n> **Usage:** `,company create <tag> <name>`');
                if (!validName(name)) return warn(message, 'You need to provide a valid company name (2-32 characters).');
                if (E.getUserCompany(userId)) return warn(message, 'You are already in a company.');
                const limit = E.getLevelInfo(1);
                const row = E.ensureAccount(userId);
                if (row.cash < limit.cost) {
                    return warn(message, `You do not have enough cash to create a company\n> You need **${E.humanizeClean(limit.cost)}** \ud83d\udcb5`);
                }
                if (E.getCompanyByName(name)) return warn(message, 'A company with this name already exists.');
                if (E.getCompanyByTag(tag.toUpperCase())) return warn(message, 'A company with this tag already exists.');
                run('INSERT INTO company (name, tag, ceo, members, privacy, roles, level, vault, reputation, votes, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    name, tag.toUpperCase(), userId, JSON.stringify([userId]), 'public', '{}', 1, 0, 0, 0, Date.now() / 1000);
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', limit.cost, userId);
                E.logging(userId, limit.cost, 'create', 'company');
                return approve(message, `Successfully created the company [\`${tag.toUpperCase()}\`] **${name}**`);
            }
        },
        delete: {
            data: { name: 'company delete', description: 'Delete your company permanently', usage: ',company delete' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to permanently delete the company **${company.name}**?`,
                    async (i) => {
                        E.clearCompany(company);
                        await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Company **${company.name}** has been permanently deleted.` }], components: [] });
                    },
                    async (i) => {
                        await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Company deletion was canceled.` }], components: [] });
                    });
            }
        },
        transfer: {
            data: { name: 'company transfer', description: "Transfer the ownership of the company to another member", usage: ',company transfer <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!member) return warn(message, 'You need to mention a member.\n> **Usage:** `,company transfer <user>`');
                const members = E.parseMembers(company);
                if (!members.includes(Number(member.id))) return warn(message, `${member} is not in your company.`);
                if (member.id === userId) return warn(message, "You can't transfer ownership to yourself.");
                const limit = E.getLevelInfo(company.level);
                const roles = E.parseRoles(company);
                const managers = Array.isArray(roles.Manager) ? roles.Manager : [];
                if (managers.length >= limit.managers) {
                    return warn(message, `Your company is already at the maximum Manager limit of **${limit.managers}**`);
                }
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to transfer ownership of the company to ${member}?`,
                    async (i) => {
                        const freshRoles = E.parseRoles(company);
                        const managerList = Array.isArray(freshRoles.Manager) ? freshRoles.Manager.map(Number) : [];
                        const seniorList = Array.isArray(freshRoles.Senior) ? freshRoles.Senior.map(Number) : [];
                        if (!managerList.includes(Number(userId))) managerList.push(Number(userId));
                        const targetRank = E.getUserRank(member.id, company);
                        if (targetRank === 3) {
                            const idx = managerList.indexOf(Number(member.id));
                            if (idx >= 0) managerList.splice(idx, 1);
                        }
                        if (targetRank === 2) {
                            const idx = seniorList.indexOf(Number(member.id));
                            if (idx >= 0) seniorList.splice(idx, 1);
                        }
                        freshRoles.Manager = managerList;
                        freshRoles.Senior = seniorList;
                        run('UPDATE company SET ceo = ?, roles = ? WHERE id = ?', member.id, JSON.stringify(freshRoles), company.id);
                        await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: ${member} is now the CEO of the company. You have been demoted to Manager.` }], components: [] });
                    },
                    async (i) => {
                        await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Ownership transfer was canceled.` }], components: [] });
                    });
            }
        },
        info: {
            data: { name: 'company info', description: 'Show information about your company or another company', usage: ',company info [name|tag]' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const name = args.join(' ').trim();
                let company;
                if (name) {
                    company = E.getCompanyByName(name) || E.getCompanyByTag(name);
                    if (!company) return warn(message, 'Company with this name does not exist.');
                } else {
                    company = E.getUserCompany(message.author.id);
                    if (!company) return warn(message, 'You are not in a company.');
                }
                return message.reply({ embeds: [companyInfoEmbed(client, company)] });
            }
        },
        userinfo: {
            data: { name: 'company userinfo', description: "Show information about a user in your company", usage: ',company userinfo [user]' },
            aliases: ['ui', 'user'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const target = message.mentions && message.mentions.users ? message.mentions.users.first() : message.author;
                const company = E.getUserCompany(target.id);
                if (!company) return warn(message, `${target} is not in a company.`);
                return message.reply({ embeds: [companyInfoEmbed(client, company)] });
            }
        },
        list: {
            data: { name: 'company list', description: "List all companys", usage: ',company list' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const results = query('SELECT * FROM company');
                if (!results.length) return warn(message, 'No **companies** found in the database.');
                const entries = results.map(result => {
                    const members = E.parseMembers(result);
                    const limit = E.getLevelInfo(result.level);
                    let networth = 0;
                    for (const memberId of members) networth += E.getUserNetworth(memberId);
                    return { name: result.name, tag: result.tag, ceo: result.ceo, members: `${members.length}/${limit.members}`, networth };
                }).sort((a, b) => b.networth - a.networth);
                const pages = [];
                for (let i = 0; i < entries.length; i += 6) {
                    const chunk = entries.slice(i, i + 6);
                    pages.push({
                        color: COLORS.NEUTRAL,
                        title: 'Companies',
                        fields: chunk.map(entry => ({
                            name: `${entry.name} | ${entry.tag}`,
                            value: `**CEO:** <@${entry.ceo}>\n**Members:** ${entry.members}\n**Networth:** ${E.humanize(entry.networth)} \ud83d\udcb5`,
                            inline: true
                        })),
                        footer: { text: `Page: ${pages.length + 1}/${Math.ceil(entries.length / 6)} (${entries.length} entries)` }
                    });
                }
                return pagesFor(message, pages);
            }
        },
        members: {
            data: { name: 'company members', description: 'Manage your company members', usage: ',company members <stats|list>' },
            execute: async (message) => {
                return warn(message, 'Use `,company members stats` or `,company members list`.');
            },
            subs: {
                stats: {
                    data: { name: 'company members stats', description: "List all members of your company with their stats", usage: ',company members stats' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const company = E.getUserCompany(message.author.id);
                        if (!company) return warn(message, 'You are not in a company.');
                        const roles = E.parseRoles(company);
                        const ranks = { [company.ceo]: 'CEO' };
                        for (const id of (roles.Manager || [])) ranks[id] = 'Manager';
                        for (const id of (roles.Senior || [])) ranks[id] = 'Senior';
                        const priority = { CEO: 1, Manager: 2, Senior: 3, Employee: 4 };
                        const members = E.parseMembers(company)
                            .sort((a, b) => priority[ranks[a] || 'Employee'] - priority[ranks[b] || 'Employee']);
                        const pages = [];
                        for (let i = 0; i < members.length; i += 9) {
                            const chunk = members.slice(i, i + 9);
                            pages.push({
                                color: COLORS.NEUTRAL,
                                title: 'Members with Stats',
                                author: { name: `${company.name} | ${company.tag}` },
                                fields: chunk.map(memberId => ({
                                    name: `<@${memberId}>`,
                                    value: `**Rank:** ${ranks[memberId] || 'Employee'}\n**Votes:** ${company.votes || 0}\n**Networth:** ${E.humanize(E.getUserNetworth(memberId))} \ud83d\udcb5`,
                                    inline: true
                                })),
                                footer: { text: `Page: ${pages.length + 1}/${Math.ceil(members.length / 9)} (${members.length} entries)` }
                            });
                        }
                        if (!pages.length) return warn(message, 'Your company has no members.');
                        return pagesFor(message, pages);
                    }
                },
                list: {
                    data: { name: 'company members list', description: "List all members of your company with their ranks", usage: ',company members list' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const company = E.getUserCompany(message.author.id);
                        if (!company) return warn(message, 'You are not in a company.');
                        const roles = E.parseRoles(company);
                        const ranks = { [company.ceo]: 'CEO' };
                        for (const id of (roles.Manager || [])) ranks[id] = 'Manager';
                        for (const id of (roles.Senior || [])) ranks[id] = 'Senior';
                        const byRank = { CEO: [], Manager: [], Senior: [], Employee: [] };
                        const emojis = { CEO: '\ud83d\udc51', Manager: '\ud83d\udcbc', Senior: '\ud83d\udd27', Employee: '\ud83d\udc64' };
                        for (const memberId of E.parseMembers(company)) {
                            byRank[ranks[memberId] || 'Employee'].push(`<@${memberId}>`);
                        }
                        return message.reply({
                            embeds: [createEmbed({
                                color: COLORS.NEUTRAL,
                                title: 'Members',
                                author: { name: `${company.name} | ${company.tag}` },
                                fields: Object.keys(byRank).map(rank => ({
                                    name: `${emojis[rank]} ${rank}`,
                                    value: byRank[rank].length ? byRank[rank].join(' ') : 'N/A',
                                    inline: true
                                }))
                            })]
                        });
                    }
                }
            }
        },
        name: {
            data: { name: 'company name', description: "Change your company's name", usage: ',company name <name>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                const name = args.join(' ').trim();
                if (!validName(name)) return warn(message, 'You need to provide a valid company name (2-32 characters).');
                if ((company.vault || 0) < 1000000) return warn(message, `Company name change costs **1,000,000** \ud83d\udcb5`);
                run('UPDATE company SET name = ?, vault = vault - 1000000 WHERE id = ?', name, company.id);
                return approve(message, `Company name successfully changed to **${name}**`);
            }
        },
        description: {
            data: { name: 'company description', description: "Change your company's description", usage: ',company description <text>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 3) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                const description = args.join(' ').trim().slice(0, 200);
                if (!description) return warn(message, 'You need to provide a description.');
                run('UPDATE company SET description = ? WHERE id = ?', description, company.id);
                return approve(message, `Company description successfully changed to:\n\`\`\`${description}\`\`\``);
            }
        },
        tag: {
            data: { name: 'company tag', description: "Change your company's tag", usage: ',company tag <tag>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                const tag = args[0];
                if (!validTag(tag)) return warn(message, 'You need to provide a valid company tag (2-6 letters/numbers).');
                if ((company.vault || 0) < 500000) return warn(message, `Company tag change costs **500,000** \ud83d\udcb5`);
                run('UPDATE company SET tag = ?, vault = vault - 500000 WHERE id = ?', tag.toUpperCase(), company.id);
                return approve(message, `Company tag successfully changed to **${tag.toUpperCase()}**`);
            }
        },
        icon: {
            data: { name: 'company icon', description: "Change your company's icon", usage: ',company icon [attachment|link]' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                const validExtensions = ['png', 'jpg', 'jpeg', 'gif'];
                const attachment = message.attachments && message.attachments.first ? message.attachments.first() : null;
                if (attachment) {
                    const extension = attachment.name.split('.').pop().toLowerCase();
                    if (!validExtensions.includes(extension)) {
                        return warn(message, 'Invalid file type. Please upload a valid image `png`, `jpg`, `jpeg` or `gif`');
                    }
                    run('UPDATE company SET icon = ? WHERE id = ?', attachment.url, company.id);
                    return approve(message, `Company icon successfully changed to [${attachment.name}](${attachment.url})`);
                }
                const icon = args[0];
                if (icon) {
                    const extension = icon.split('?')[0].split('.').pop().toLowerCase();
                    if (!validExtensions.includes(extension)) {
                        return warn(message, 'Invalid file type. Please provide a valid image URL (png, jpg, jpeg, gif).');
                    }
                    run('UPDATE company SET icon = ? WHERE id = ?', icon, company.id);
                    return approve(message, `Company icon successfully changed to ${icon}`);
                }
                return warn(message, 'You must provide an attachment or a link to an image');
            }
        },
        upgrade: {
            data: { name: 'company upgrade', description: 'Upgrade your company', usage: ',company upgrade' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (E.getUserRank(userId, company) < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                const upgradeData = first('SELECT * FROM company_upgrades WHERE level = ?', (company.level || 1) + 1);
                if (!upgradeData) return warn(message, 'Your company is already at the maximum level.');
                if ((company.vault || 0) < upgradeData.cost) {
                    return warn(message, `You do not have enough cash to upgrade your company\n> You need **${E.humanize(upgradeData.cost)}** \ud83d\udcb5`);
                }
                if ((company.reputation || 0) < upgradeData.reputation) {
                    return warn(message, `You do not have enough reputation to upgrade your company\n> You need **${upgradeData.reputation}** reputation`);
                }
                run('UPDATE company SET level = level + 1, vault = vault - ? WHERE id = ?', upgradeData.cost, company.id);
                return approve(message, `Your company has been successfully upgraded to level **${(company.level || 1) + 1}**`);
            }
        },
        leaderboard: {
            data: { name: 'company leaderboard', description: 'View the company leaderboard', usage: ',company leaderboard <reputation|votes|vault|networth>' },
            aliases: ['lb'],
            execute: async (message) => {
                return warn(message, 'Use `,company leaderboard <reputation|votes|vault|networth>`.');
            },
            subs: {
                reputation: {
                    data: { name: 'company leaderboard reputation', description: "View the company leaderboard by reputation", usage: ',company leaderboard reputation' },
                    aliases: ['rep'],
                    execute: async (message, args, client) => {
                        const results = query('SELECT name, tag, reputation FROM company ORDER BY reputation DESC');
                        if (!results.length) return warn(message, 'No companies found in the database.');
                        return pagesFor(message, results.map(result => ({
                            color: COLORS.NEUTRAL,
                            description: `**${result.name} | ${result.tag}** - ${result.reputation} reputation`
                        })));
                    }
                },
                votes: {
                    data: { name: 'company leaderboard votes', description: "View the company leaderboard by votes", usage: ',company leaderboard votes' },
                    execute: async (message, args, client) => {
                        const results = query('SELECT id, name, tag FROM company');
                        if (!results.length) return warn(message, 'No companies found in the database.');
                        const entries = results.map(result => {
                            const votes = first('SELECT COALESCE(SUM(votes), 0) AS total FROM company_voters WHERE company_id = ?', result.id);
                            return { name: result.name, tag: result.tag, votes: votes ? votes.total : 0 };
                        }).sort((a, b) => b.votes - a.votes);
                        return pagesFor(message, entries.map(entry => ({
                            color: COLORS.NEUTRAL,
                            description: `**${entry.name} | ${entry.tag}** - ${entry.votes} votes`
                        })));
                    }
                },
                vault: {
                    data: { name: 'company leaderboard vault', description: "View the company leaderboard by vault", usage: ',company leaderboard vault' },
                    execute: async (message, args, client) => {
                        const results = query('SELECT name, tag, vault FROM company ORDER BY vault DESC');
                        if (!results.length) return warn(message, 'No companies found in the database.');
                        return pagesFor(message, results.map(result => ({
                            color: COLORS.NEUTRAL,
                            description: `**${result.name} | ${result.tag}** - ${E.humanize(result.vault || 0)} \ud83d\udcb5`
                        })));
                    }
                },
                networth: {
                    data: { name: 'company leaderboard networth', description: "View the company leaderboard by networth", usage: ',company leaderboard networth' },
                    aliases: ['nw'],
                    execute: async (message, args, client) => {
                        const results = query('SELECT name, tag, members FROM company');
                        if (!results.length) return warn(message, 'No companies found in the database.');
                        const entries = results.map(result => {
                            let networth = 0;
                            for (const memberId of E.parseMembers(result)) networth += E.getUserNetworth(memberId);
                            return { name: result.name, tag: result.tag, networth };
                        }).sort((a, b) => b.networth - a.networth);
                        return pagesFor(message, entries.map(entry => ({
                            color: COLORS.NEUTRAL,
                            description: `**${entry.name} | ${entry.tag}** - ${E.humanize(entry.networth)} \ud83d\udcb5`
                        })));
                    }
                }
            }
        },
        privacy: {
            data: { name: 'company privacy', description: "Change your company's privacy settings", usage: ',company privacy <public|request|closed>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (![3, 4].includes(E.getUserRank(userId, company))) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                const privacy = String(args[0] || '').toLowerCase();
                if (!['public', 'request', 'closed'].includes(privacy)) {
                    return warn(message, 'Invalid privacy setting. Choose between `public`, `request` or `closed`');
                }
                run('UPDATE company SET privacy = ? WHERE id = ?', privacy, company.id);
                return approve(message, `Company privacy successfully changed to **${privacy}**`);
            }
        },
        join: {
            data: { name: 'company join', description: 'Join a company', usage: ',company join <name>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You need to provide a company name.\n> **Usage:** `,company join <name>`');
                if (E.getUserCompany(userId)) return warn(message, 'You are already in a company.');
                const company = E.getCompanyByName(name) || E.getCompanyByTag(name);
                if (!company) return warn(message, 'Company with this name does not exist.');
                if (company.privacy === 'closed') return warn(message, "This company is closed and can't be joined.");
                if (company.privacy === 'request') {
                    return warn(message, `This company requires a request to join.\n> Use \`${require('../../utils/moderation').prefix(message)}company request ${name}\` to send a request.`);
                }
                const limit = E.getLevelInfo(company.level);
                const members = E.parseMembers(company);
                if (members.length >= limit.members) {
                    return warn(message, `Company is already at the maximum member limit of **${limit.members}**`);
                }
                members.push(Number(userId));
                run('UPDATE company SET members = ? WHERE id = ?', JSON.stringify(members), company.id);
                return approve(message, `Successfully joined the company **${company.name}**`);
            }
        },
        leave: {
            data: { name: 'company leave', description: 'Leave your company', usage: ',company leave' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                const rank = E.getUserRank(userId, company);
                if (rank === 4) return warn(message, "You can't leave the company as the CEO. Transfer ownership or disband the company.");
                const roles = E.parseRoles(company);
                if (rank === 3 && Array.isArray(roles.Manager)) roles.Manager = roles.Manager.filter(id => Number(id) !== Number(userId));
                if (rank === 2 && Array.isArray(roles.Senior)) roles.Senior = roles.Senior.filter(id => Number(id) !== Number(userId));
                const members = E.parseMembers(company).filter(id => Number(id) !== Number(userId));
                run('UPDATE company SET members = ?, roles = ? WHERE id = ?', JSON.stringify(members), JSON.stringify(roles), company.id);
                return approve(message, `You have successfully left the company **${company.name}**`);
            }
        },
        kick: {
            data: { name: 'company kick', description: 'Kick a member from the company', usage: ',company kick <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                const authorRank = E.getUserRank(userId, company);
                if (![3, 4].includes(authorRank)) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!member) return warn(message, 'You need to mention a member.\n> **Usage:** `,company kick <user>`');
                const members = E.parseMembers(company);
                if (!members.includes(Number(member.id))) return warn(message, `${member} is not in your company.`);
                const targetRank = E.getUserRank(member.id, company);
                if (targetRank === 4) return warn(message, "You can't kick the CEO.");
                if (authorRank <= targetRank) return warn(message, "You can't kick someone with the same or higher rank.");
                const roles = E.parseRoles(company);
                if (targetRank === 3 && Array.isArray(roles.Manager)) roles.Manager = roles.Manager.filter(id => Number(id) !== Number(member.id));
                if (targetRank === 2 && Array.isArray(roles.Senior)) roles.Senior = roles.Senior.filter(id => Number(id) !== Number(member.id));
                run('UPDATE company SET members = ?, roles = ? WHERE id = ?', JSON.stringify(members.filter(id => Number(id) !== Number(member.id))), JSON.stringify(roles), company.id);
                return approve(message, `${member} has been kicked from the company.`);
            }
        },
        uprank: {
            data: { name: 'company uprank', description: 'Promote a member within the company', usage: ',company uprank <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                const authorRank = E.getUserRank(userId, company);
                if (![3, 4].includes(authorRank)) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!member) return warn(message, 'You need to mention a member.\n> **Usage:** `,company uprank <user>`');
                if (!E.parseMembers(company).includes(Number(member.id))) return warn(message, `${member} is not in your company.`);
                const targetRank = E.getUserRank(member.id, company);
                if (authorRank <= targetRank) return warn(message, "You can't uprank someone with the same or higher rank.");
                const roles = E.parseRoles(company);
                roles.Manager = Array.isArray(roles.Manager) ? roles.Manager.map(Number) : [];
                roles.Senior = Array.isArray(roles.Senior) ? roles.Senior.map(Number) : [];
                let newRank;
                if (targetRank === 2) {
                    if (authorRank < 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                    const limit = E.getLevelInfo(company.level);
                    if (roles.Manager.length >= limit.managers) {
                        return warn(message, `Your company is already at the maximum Manager limit of **${limit.managers}**`);
                    }
                    roles.Senior = roles.Senior.filter(id => id !== Number(member.id));
                    roles.Manager.push(Number(member.id));
                    newRank = 'Manager';
                } else if (targetRank === 1) {
                    roles.Senior.push(Number(member.id));
                    newRank = 'Senior';
                } else {
                    return warn(message, 'User cannot be promoted further.');
                }
                run('UPDATE company SET roles = ? WHERE id = ?', JSON.stringify(roles), company.id);
                return approve(message, `${member} has been promoted to **${newRank}**.`);
            }
        },
        downrank: {
            data: { name: 'company downrank', description: 'Demote a member within the company', usage: ',company downrank <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                const authorRank = E.getUserRank(userId, company);
                if (![3, 4].includes(authorRank)) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!member) return warn(message, 'You need to mention a member.\n> **Usage:** `,company downrank <user>`');
                if (!E.parseMembers(company).includes(Number(member.id))) return warn(message, `${member} is not in your company.`);
                const targetRank = E.getUserRank(member.id, company);
                if (targetRank === 1) return warn(message, `${member} is already an **Employee** and can't be downranked further.`);
                if (authorRank <= targetRank) return warn(message, "You can't downrank someone with the same or higher rank.");
                const roles = E.parseRoles(company);
                roles.Manager = Array.isArray(roles.Manager) ? roles.Manager.map(Number) : [];
                roles.Senior = Array.isArray(roles.Senior) ? roles.Senior.map(Number) : [];
                let newRank;
                if (targetRank === 3) {
                    roles.Manager = roles.Manager.filter(id => id !== Number(member.id));
                    roles.Senior.push(Number(member.id));
                    newRank = 'Senior';
                } else {
                    roles.Senior = roles.Senior.filter(id => id !== Number(member.id));
                    newRank = 'Employee';
                }
                run('UPDATE company SET roles = ? WHERE id = ?', JSON.stringify(roles), company.id);
                return approve(message, `${member} has been demoted to **${newRank}**.`);
            }
        },
        requests: {
            data: { name: 'company requests', description: "View all pending join requests for your company", usage: ',company requests' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (![2, 3, 4].includes(E.getUserRank(userId, company))) {
                    return warn(message, 'You are **missing** the following permission: `CEO`, `Manager` or `Senior`');
                }
                const requests = query('SELECT user_id, created, text FROM company_requests WHERE company_id = ?', company.id);
                if (!requests.length) return warn(message, 'There are no pending requests.');

                const state = { index: 0 };
                const buildRows = () => [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('req_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('req_next').setLabel('Next').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('req_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('req_deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
                )];
                const buildEmbed = () => createEmbed({
                    color: COLORS.NEUTRAL,
                    title: 'Join Requests',
                    author: { name: `${company.name} | ${company.tag}` },
                    fields: [
                        { name: 'User', value: `<@${requests[state.index].user_id}>`, inline: true },
                        { name: 'Networth', value: `${E.humanize(E.getUserNetworth(requests[state.index].user_id))} \ud83d\udcb5`, inline: true },
                        { name: 'Created', value: `<t:${Math.floor(requests[state.index].created)}:f>`, inline: true },
                        { name: 'Application', value: `\`\`\`${requests[state.index].text || 'N/A'}\`\`\``, inline: false }
                    ],
                    footer: { text: `Page: ${state.index + 1}/${requests.length} (${requests.length} entries)` }
                });

                const sent = await message.reply({ embeds: [buildEmbed()], components: buildRows() });
                const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 120000 });
                collector.on('collect', async i => {
                    const request = requests[state.index];
                    if (i.customId === 'req_prev') {
                        state.index = (state.index - 1 + requests.length) % requests.length;
                        return i.update({ embeds: [buildEmbed()], components: buildRows() }).catch(() => {});
                    }
                    if (i.customId === 'req_next') {
                        state.index = (state.index + 1) % requests.length;
                        return i.update({ embeds: [buildEmbed()], components: buildRows() }).catch(() => {});
                    }
                    collector.stop();
                    if (i.customId === 'req_accept') {
                        const limit = E.getLevelInfo(company.level);
                        const members = E.parseMembers(company);
                        if (members.includes(Number(request.user_id))) {
                            run('DELETE FROM company_requests WHERE user_id = ? AND company_id = ?', request.user_id, company.id);
                            return i.update({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: That user is already in your company.` })], components: [] }).catch(() => {});
                        }
                        if (members.length >= limit.members) {
                            return i.update({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: Your company is already at the maximum member limit of **${limit.members}**` })], components: [] }).catch(() => {});
                        }
                        members.push(Number(request.user_id));
                        run('UPDATE company SET members = ? WHERE id = ?', JSON.stringify(members), company.id);
                        run('DELETE FROM company_requests WHERE user_id = ? AND company_id = ?', request.user_id, company.id);
                        return i.update({ embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Accepted <@${request.user_id}> into your company.` })], components: [] }).catch(() => {});
                    }
                    run('DELETE FROM company_requests WHERE user_id = ? AND company_id = ?', request.user_id, company.id);
                    return i.update({ embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Denied the join request from <@${request.user_id}>.` })], components: [] }).catch(() => {});
                });
                collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
            }
        },
        request: {
            data: { name: 'company request', description: 'Send a request to join a company or cancel an active request', usage: ',company request <name> <text>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const name = args[0];
                const text = args.slice(1).join(' ').trim();
                if (!name) return warn(message, 'You need to provide a company name.\n> **Usage:** `,company request <name> <text>`');
                if (E.getUserCompany(userId)) return warn(message, 'You are already in a company.');
                const company = E.getCompanyByName(name) || E.getCompanyByTag(name);
                if (!company) return warn(message, 'Company with this name does not exist.');
                const pending = first('SELECT 1 AS ok FROM company_requests WHERE user_id = ? AND company_id = ?', userId, company.id);
                if (text.toLowerCase() === 'cancel') {
                    if (!pending) return warn(message, 'You have no active join request.');
                    run('DELETE FROM company_requests WHERE user_id = ? AND company_id = ?', userId, company.id);
                    return approve(message, 'Successfully cancelled your join request.');
                }
                if (pending) return warn(message, `You already have a pending join request for **${company.name}**`);
                if (company.privacy === 'closed') return warn(message, "This company is closed and can't be joined.");
                if (company.privacy === 'public') return warn(message, 'This company is public, you can join directly.');
                if (!text) return warn(message, 'You need to provide application text.\n> **Usage:** `,company request <name> <text>`');
                const limit = E.getLevelInfo(company.level);
                if (E.parseMembers(company).length >= limit.members) {
                    return warn(message, `Company is already at the maximum member limit of **${limit.members}**`);
                }
                run('INSERT INTO company_requests (user_id, company_id, text, created) VALUES (?, ?, ?, ?)', userId, company.id, text.slice(0, 500), Date.now() / 1000);
                return approve(message, `Successfully sent a request to join the company **${company.name}**`);
            }
        },
        invite: {
            data: { name: 'company invite', description: 'Invite a user to join your company', usage: ',company invite <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!member) return warn(message, 'You need to mention a member.\n> **Usage:** `,company invite <user>`');
                const targetCompany = E.getUserCompany(member.id);
                if (targetCompany) {
                    if (Number(targetCompany.id) === Number(company.id)) return warn(message, `${member} is already in your company.`);
                    return warn(message, `${member} is already in a company.`);
                }
                if (![2, 3, 4].includes(E.getUserRank(userId, company))) {
                    return warn(message, 'You are **missing** the following permission: `CEO`, `Manager` or `Senior`');
                }
                if (first('SELECT 1 AS ok FROM company_invites WHERE user_id = ? AND company_id = ?', member.id, company.id)) {
                    return warn(message, `${member} already has a pending invite request for your company.`);
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('inv_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('inv_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
                );
                let dm;
                try {
                    dm = await member.send({
                        embeds: [createEmbed({
                            color: COLORS.NEUTRAL,
                            description: `${EMOJIS.QUESTION} You have been invited by ${message.author} to join the company **${company.name}**`
                        })],
                        components: [row]
                    });
                } catch (err) {
                    return warn(message, `${member} has disabled DMs and can't be invited.`);
                }
                run('INSERT INTO company_invites (user_id, company_id, message_id, created) VALUES (?, ?, ?, ?)', member.id, company.id, dm.id, Date.now() / 1000);

                const collector = dm.createMessageComponentCollector({ filter: i => i.user.id === member.id, time: 300000 });
                collector.on('collect', async i => {
                    collector.stop();
                    const invite = first('SELECT 1 AS ok FROM company_invites WHERE user_id = ? AND company_id = ?', i.user.id, company.id);
                    if (!invite) {
                        return i.update({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} This invite is no longer valid.` })], components: [] }).catch(() => {});
                    }
                    if (i.customId === 'inv_decline') {
                        run('DELETE FROM company_invites WHERE user_id = ? AND company_id = ?', i.user.id, company.id);
                        return i.update({ embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} You declined the invite.` })], components: [] }).catch(() => {});
                    }
                    const limit = E.getLevelInfo(company.level);
                    const members = E.parseMembers(company);
                    if (members.length >= limit.members) {
                        run('DELETE FROM company_invites WHERE user_id = ? AND company_id = ?', i.user.id, company.id);
                        return i.update({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} The company is already at the maximum member limit.` })], components: [] }).catch(() => {});
                    }
                    members.push(Number(i.user.id));
                    run('UPDATE company SET members = ? WHERE id = ?', JSON.stringify(members), company.id);
                    run('DELETE FROM company_invites WHERE user_id = ? AND company_id = ?', i.user.id, company.id);
                    return i.update({ embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} You joined **${company.name}**!` })], components: [] }).catch(() => {});
                });

                return approve(message, `Successfully sent an invite to ${member}`);
            }
        },
        uninvite: {
            data: { name: 'company uninvite', description: 'Uninvite a user from joining your company', usage: ',company uninvite <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const company = E.getUserCompany(userId);
                if (!company) return warn(message, 'You are not in a company.');
                if (![2, 3, 4].includes(E.getUserRank(userId, company))) {
                    return warn(message, 'You are **missing** the following permission: `CEO`, `Manager` or `Senior`');
                }
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!member) return warn(message, 'You need to mention a member.\n> **Usage:** `,company uninvite <user>`');
                if (!first('SELECT 1 AS ok FROM company_invites WHERE user_id = ? AND company_id = ?', member.id, company.id)) {
                    return warn(message, `${member} does not have a pending invite request for your company.`);
                }
                run('DELETE FROM company_invites WHERE user_id = ? AND company_id = ?', member.id, company.id);
                return approve(message, `Successfully uninvited ${member}`);
            }
        },
        vault: {
            data: { name: 'company vault', description: 'Manage your company vault', usage: ',company vault <deposit|withdraw|bonus|limit|logs>' },
            execute: async (message) => {
                return warn(message, 'Use `,company vault <deposit|withdraw|bonus|limit|logs>`.');
            },
            subs: {
                deposit: {
                    data: { name: 'company vault deposit', description: 'Deposit cash into your company vault', usage: ',company vault deposit <amount>' },
                    aliases: ['dep'],
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        const amount = parseAmountArg(args[0]);
                        if (!Number.isFinite(amount) || amount <= 0) return warn(message, 'You need to provide a valid amount.\n> **Usage:** `,company vault deposit <amount>`');
                        const row = E.ensureAccount(userId);
                        if (row.cash < amount) return warn(message, "You don't have enough cash to deposit.");
                        E.depositVault(company, userId, amount, 'deposit');
                        E.addDepositMoney(userId, 'vault', amount);
                        E.logging(userId, amount, 'deposit', 'vault');
                        return approve(message, `Successfully deposited **${E.humanize(amount)}** \ud83d\udcb5 into the company vault.`);
                    }
                },
                withdraw: {
                    data: { name: 'company vault withdraw', description: 'Withdraw cash from your company vault', usage: ',company vault withdraw <amount>' },
                    aliases: ['with'],
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        if (E.getUserRank(userId, company) !== 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                        const amount = parseAmountArg(args[0]);
                        if (!Number.isFinite(amount) || amount <= 0) return warn(message, 'You need to provide a valid amount.\n> **Usage:** `,company vault withdraw <amount>`');
                        if ((company.vault || 0) < amount) return warn(message, 'The company vault does not have enough money.');
                        E.withdrawVault(company, userId, amount, 'withdraw');
                        E.logging(userId, amount, 'withdraw', 'vault');
                        const today = new Date().toISOString().slice(0, 10);
                        run('INSERT INTO company_limit_withdraw (user_id, spent, date) VALUES (?, ?, ?) ON CONFLICT (user_id, date) DO UPDATE SET spent = spent + excluded.spent', userId, amount, today);
                        return approve(message, `Successfully withdrew **${E.humanize(amount)}** \ud83d\udcb5 from the company vault.`);
                    }
                },
                bonus: {
                    data: { name: 'company vault bonus', description: 'Send a bonus to a user from your company vault', usage: ',company vault bonus <user> <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        if (E.getUserRank(userId, company) !== 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                        const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                        const amount = parseAmountArg(args[1]);
                        if (!member || !Number.isFinite(amount) || amount <= 0) {
                            return warn(message, 'You need to provide a member and a valid amount.\n> **Usage:** `,company vault bonus <user> <amount>`');
                        }
                        if (!E.parseMembers(company).includes(Number(member.id))) return warn(message, `${member} is not in your company.`);
                        const limit = E.getLevelInfo(company.level);
                        const today = new Date().toISOString().slice(0, 10);
                        const spent = first('SELECT spent FROM company_limit_bonus WHERE user_id = ? AND date = ?', member.id, today);
                        const dailyLimit = (limit.bonus || 0) - (spent ? spent.spent : 0);
                        if (amount > dailyLimit) {
                            return warn(message, `You reached daily vault bonus limit. You can send **${E.humanize(Math.max(dailyLimit, 0))}** \ud83d\udcb5 bonus today!`);
                        }
                        if ((company.vault || 0) < amount) return warn(message, 'The company vault does not have enough money.');
                        E.withdrawVault(company, member.id, amount, 'bonus');
                        E.logging(userId, amount, 'bonus', 'vault');
                        run('INSERT INTO company_limit_bonus (user_id, spent, date) VALUES (?, ?, ?) ON CONFLICT (user_id, date) DO UPDATE SET spent = spent + excluded.spent', member.id, amount, today);
                        return approve(message, `Successfully sent a bonus of **${E.humanize(amount)}** \ud83d\udcb5 to ${member}`);
                    }
                },
                limit: {
                    data: { name: 'company vault limit', description: "Set the company vault limit", usage: ',company vault limit <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        if (E.getUserRank(userId, company) !== 4) return warn(message, 'You are **missing** the following permission: `CEO`');
                        const amount = parseAmountArg(args[0]);
                        if (!Number.isFinite(amount) || amount < 0) return warn(message, 'You need to provide a valid amount.\n> **Usage:** `,company vault limit <amount>`');
                        run('UPDATE company SET vault_limit = ? WHERE id = ?', amount, company.id);
                        return approve(message, `Company vault limit successfully set to **${E.humanize(amount)}** \ud83d\udcb5`);
                    }
                },
                logs: {
                    data: { name: 'company vault logs', description: 'View the company vault logs', usage: ',company vault logs' },
                    aliases: ['history'],
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const company = E.getUserCompany(message.author.id);
                        if (!company) return warn(message, 'You are not in a company.');
                        const logs = query('SELECT * FROM company_vault WHERE company_id = ? ORDER BY created DESC', company.id);
                        if (!logs.length) return warn(message, 'No logs found in the database.');
                        return pagesFor(message, logs.map(log => ({
                            color: COLORS.NEUTRAL,
                            description: `**${String(log.type).charAt(0).toUpperCase() + String(log.type).slice(1)}** by <@${log.user_id}> | ${E.humanize(log.amount)} \ud83d\udcb5 - <t:${Math.floor(log.created)}:f>`
                        })));
                    }
                }
            }
        },
        project: {
            data: { name: 'company project', description: 'Manage your company projects', usage: ',company project <start|cancel|status|contribute|participants|complete|collect|list>' },
            execute: async (message) => {
                return warn(message, 'Use `,company project <start|cancel|status|contribute|participants|complete|collect|list>`.');
            },
            subs: {
                start: {
                    data: { name: 'company project start', description: 'Start a project for your company', usage: ',company project start <name>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        if (E.activeProject(company.id)) return warn(message, 'You already have an active project.');
                        if (![3, 4].includes(E.getUserRank(userId, company))) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'You need to provide a project name.\n> **Usage:** `,company project start <name>`');
                        const project = first('SELECT * FROM company_projects WHERE LOWER(name) = LOWER(?)', name);
                        if (!project) return warn(message, 'Project with this name does not exist.');
                        if ((company.level || 1) < project.group) {
                            return warn(message, 'Your company is not at the required level to start this project');
                        }
                        run('INSERT INTO company_projects_started (company_id, project_name, money, votes, active, participant, created) VALUES (?, ?, 0, 0, 1, ?, ?)',
                            company.id, project.name, '{}', Date.now() / 1000);
                        return approve(message, `Successfully started the project **${project.name}**`);
                    }
                },
                cancel: {
                    data: { name: 'company project cancel', description: 'Cancel your company project', usage: ',company project cancel' },
                    aliases: ['stop'],
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        if (!E.activeProject(company.id)) return warn(message, "You don't have an active project.");
                        if (![3, 4].includes(E.getUserRank(userId, company))) return warn(message, 'You are **missing** the following permission: `CEO` or `Manager`');
                        run('UPDATE company_projects_started SET active = 0 WHERE company_id = ? AND active = 1', company.id);
                        return approve(message, 'Successfully cancelled the project.');
                    }
                },
                status: {
                    data: { name: 'company project status', description: 'View the status of your company project', usage: ',company project status' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const company = E.getUserCompany(message.author.id);
                        if (!company) return warn(message, 'You are not in a company.');
                        const started = E.activeProject(company.id);
                        if (!started) return warn(message, "You don't have an active project.");
                        const project = first('SELECT * FROM company_projects WHERE name = ?', started.project_name);
                        if (!project) return warn(message, 'Project with this name does not exist.');
                        return message.reply({
                            embeds: [createEmbed({
                                color: COLORS.NEUTRAL,
                                title: `${project.name} ${project.emoji || ''}`,
                                description: project.description || '',
                                fields: [
                                    { name: 'Cost', value: `${E.humanize(started.money || 0)}/${E.humanize(project.cost)}`, inline: true },
                                    { name: 'Votes', value: `${company.votes || 0}/${project.votes}`, inline: true }
                                ],
                                image: project.image || undefined
                            })]
                        });
                    }
                },
                contribute: {
                    data: { name: 'company project contribute', description: 'Contribute to your company project', usage: ',company project contribute <amount>' },
                    aliases: ['cont'],
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        const started = E.activeProject(company.id);
                        if (!started) return warn(message, "You don't have an active project.");
                        const amount = parseAmountArg(args[0]);
                        if (!Number.isFinite(amount) || amount <= 0) return warn(message, 'You need to provide a valid amount.\n> **Usage:** `,company project contribute <amount>`');
                        const row = E.ensureAccount(userId);
                        if (row.cash < amount) return warn(message, "You don't have enough cash to contribute.");
                        let participants = {};
                        try { participants = JSON.parse(started.participant || '{}') || {}; } catch (err) { participants = {}; }
                        participants[String(userId)] = (participants[String(userId)] || 0) + amount;
                        run('UPDATE company_projects_started SET money = money + ?, participant = ? WHERE company_id = ? AND active = 1', amount, JSON.stringify(participants), company.id);
                        run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, userId);
                        E.logging(userId, amount, 'contribute', 'project');
                        return approve(message, `Successfully contributed **${E.humanize(amount)}** \ud83d\udcb5 to the project **${started.project_name}**`);
                    }
                },
                participants: {
                    data: { name: 'company project participants', description: 'View the participants of your company project', usage: ',company project participants' },
                    aliases: ['part'],
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const company = E.getUserCompany(message.author.id);
                        if (!company) return warn(message, 'You are not in a company.');
                        const started = E.activeProject(company.id);
                        if (!started) return warn(message, "You don't have an active project.");
                        let participants = {};
                        try { participants = JSON.parse(started.participant || '{}') || {}; } catch (err) { participants = {}; }
                        const keys = Object.keys(participants);
                        if (!keys.length) return warn(message, 'No participants found.');
                        return pagesFor(message, keys.map(key => ({
                            color: COLORS.NEUTRAL,
                            description: `**<@${key}>** - ${E.humanize(participants[key])} \ud83d\udcb5`
                        })));
                    }
                },
                complete: {
                    data: { name: 'company project complete', description: 'Complete your company project', usage: ',company project complete' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        const started = E.activeProject(company.id);
                        if (!started) return warn(message, "You don't have an active project.");
                        const project = first('SELECT * FROM company_projects WHERE name = ?', started.project_name);
                        if (!project) return warn(message, 'Project with this name does not exist.');
                        if ((started.money || 0) < project.cost) {
                            return warn(message, 'You have not reached the required amount of **money** to complete the project.');
                        }
                        if ((company.votes || 0) < project.votes) {
                            return warn(message, 'You have not reached the required amount of **votes** to complete the project.');
                        }
                        run('UPDATE company_projects_started SET active = 0 WHERE company_id = ?', company.id);
                        run('UPDATE company SET reputation = reputation + ?, votes = votes - ? WHERE id = ?', project.reputation, project.votes, company.id);
                        E.addVault(company, userId, project.earnings - project.cost, 'project completion');
                        let participants = {};
                        try { participants = JSON.parse(started.participant || '{}') || {}; } catch (err) { participants = {}; }
                        for (const [memberId, contributed] of Object.entries(participants)) {
                            const earnings = project.earnings * (contributed / project.cost);
                            const existing = first('SELECT 1 AS ok FROM company_earnings WHERE company_id = ? AND user_id = ?', company.id, memberId);
                            if (!existing) {
                                run('INSERT INTO company_earnings (user_id, company_id, amount) VALUES (?, ?, ?)', memberId, company.id, earnings);
                            } else {
                                run('UPDATE company_earnings SET amount = amount + ? WHERE company_id = ? AND user_id = ?', earnings, company.id, memberId);
                            }
                        }
                        return approve(message, `Successfully completed the project **${started.project_name}** and earned **${E.humanize(project.earnings)}** \ud83d\udcb5 + ${project.reputation} Reputation`);
                    }
                },
                collect: {
                    data: { name: 'company project collect', description: 'Collect your company project earnings', usage: ',company project collect <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const company = E.getUserCompany(userId);
                        if (!company) return warn(message, 'You are not in a company.');
                        const earnings = first('SELECT * FROM company_earnings WHERE company_id = ? AND user_id = ?', company.id, userId);
                        if (!earnings) return warn(message, 'You have no earnings to collect.');
                        const amount = String(args[0] || '').toLowerCase() === 'all'
                            ? Math.floor(earnings.amount)
                            : parseAmountArg(args[0]);
                        if (!Number.isFinite(amount) || amount <= 0) return warn(message, 'You need to provide a valid amount.\n> **Usage:** `,company project collect <amount>`');
                        if (earnings.amount < amount) return warn(message, "You don't have enough earnings to collect.");
                        run('UPDATE company_earnings SET amount = amount - ? WHERE company_id = ? AND user_id = ?', amount, company.id, userId);
                        run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', amount, userId);
                        E.logging(userId, amount, 'collect', 'project');
                        return approve(message, `Successfully collected **${E.humanize(amount)}** \ud83d\udcb5 from your company project earnings.`);
                    }
                },
                list: {
                    data: { name: 'company project list', description: 'List all projects that exist', usage: ',company project list' },
                    execute: async (message, args, client) => {
                        const results = query('SELECT * FROM company_projects ORDER BY cost ASC');
                        if (!results.length) return warn(message, 'No projects found in the database.');
                        const groups = ['A', 'B', 'C', 'D'];
                        const pages = results.map((result, index) => ({
                            color: COLORS.NEUTRAL,
                            title: `${result.name} ${result.emoji || ''} | ${groups[(result.group || 1) - 1] || 'A'}`,
                            description: result.description || '',
                            fields: [
                                { name: 'Cost', value: `${E.humanize(result.cost)} \ud83d\udcb5\n${result.votes} Votes`, inline: true },
                                { name: 'Revenue', value: `${E.humanize(result.earnings)} \ud83d\udcb5\n${result.reputation} Reputation`, inline: true },
                                { name: 'Profit', value: `${E.humanize(result.earnings - result.cost)} \ud83d\udcb5\n${result.reputation} Reputation`, inline: true }
                            ],
                            image: result.image || undefined,
                            footer: { text: `Page: ${index + 1}/${results.length} (${results.length} entries)` }
                        }));
                        return pagesFor(message, pages);
                    }
                }
            }
        }
    }
};
