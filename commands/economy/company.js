const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getCompany, getCompanyByMember, createCompany, addMember, removeMember, upgradeCompany, startProject, collectProject, cancelProject, deleteCompany } = require('../../utils/company');
const { getUser, updateWallet } = require('../../utils/economy');
const { Paginator } = require('../../utils/pagination');

const COMPANY_TYPES = [
    { id: 'food_stand', name: 'Food Stand', cost: 250000, maxMembers: 5, projectBonus: 1, icon: '🍔', color: 0xf39c12 },
    { id: 'coffee_shop', name: 'Coffee Shop', cost: 500000, maxMembers: 7, projectBonus: 1.2, icon: '☕', color: 0x6f4e37 },
    { id: 'boutique', name: 'Boutique', cost: 1000000, maxMembers: 8, projectBonus: 1.4, icon: '👗', color: 0xe91e63 },
    { id: 'tech_startup', name: 'Tech Startup', cost: 2500000, maxMembers: 10, projectBonus: 1.6, icon: '💻', color: 0x2196f3 },
    { id: 'marketing_agency', name: 'Marketing Agency', cost: 5000000, maxMembers: 12, projectBonus: 1.8, icon: '📢', color: 0x9c27b0 },
    { id: 'real_estate', name: 'Real Estate Firm', cost: 10000000, maxMembers: 15, projectBonus: 2.0, icon: '🏠', color: 0x4caf50 },
    { id: 'investment_bank', name: 'Investment Bank', cost: 25000000, maxMembers: 18, projectBonus: 2.5, icon: '🏦', color: 0x00bcd4 },
    { id: 'aerospace', name: 'Aerospace Corp', cost: 50000000, maxMembers: 20, projectBonus: 3.0, icon: '🚀', color: 0x607d8b },
    { id: 'pharma', name: 'Pharmaceutical Giant', cost: 100000000, maxMembers: 25, projectBonus: 4.0, icon: '💊', color: 0x009688 },
    { id: 'conglomerate', name: 'Global Conglomerate', cost: 250000000, maxMembers: 30, projectBonus: 5.0, icon: '🌍', color: 0xff5722 },
];

const PROJECTS = [
    { name: 'Flyer Distribution', cost: 5000, rewardMin: 8000, rewardMax: 15000, duration: 3600000, tier: 1, levelReq: 1 },
    { name: 'Social Media Ad', cost: 10000, rewardMin: 16000, rewardMax: 28000, duration: 5400000, tier: 1, levelReq: 1 },
    { name: 'Local Sponsorship', cost: 15000, rewardMin: 24000, rewardMax: 42000, duration: 7200000, tier: 1, levelReq: 1 },
    { name: 'Pop-up Store', cost: 20000, rewardMin: 32000, rewardMax: 55000, duration: 9000000, tier: 1, levelReq: 1 },
    { name: 'Marketing Campaign', cost: 50000, rewardMin: 80000, rewardMax: 140000, duration: 14400000, tier: 2, levelReq: 3 },
    { name: 'Product Launch', cost: 75000, rewardMin: 120000, rewardMax: 210000, duration: 18000000, tier: 2, levelReq: 3 },
    { name: 'Brand Partnership', cost: 100000, rewardMin: 160000, rewardMax: 280000, duration: 21600000, tier: 2, levelReq: 3 },
    { name: 'Hiring Spree', cost: 60000, rewardMin: 95000, rewardMax: 170000, duration: 16200000, tier: 2, levelReq: 3 },
    { name: 'Research Initiative', cost: 200000, rewardMin: 320000, rewardMax: 550000, duration: 28800000, tier: 3, levelReq: 5 },
    { name: 'Expansion Plan', cost: 300000, rewardMin: 480000, rewardMax: 820000, duration: 36000000, tier: 3, levelReq: 5 },
    { name: 'IPO Preparation', cost: 400000, rewardMin: 640000, rewardMax: 1100000, duration: 43200000, tier: 3, levelReq: 5 },
    { name: 'Merger Deal', cost: 350000, rewardMin: 560000, rewardMax: 950000, duration: 39600000, tier: 3, levelReq: 5 },
    { name: 'Global Expansion', cost: 1000000, rewardMin: 1600000, rewardMax: 2800000, duration: 64800000, tier: 4, levelReq: 7 },
    { name: 'Acquisition Deal', cost: 1500000, rewardMin: 2400000, rewardMax: 4200000, duration: 79200000, tier: 4, levelReq: 7 },
    { name: 'Patent Portfolio', cost: 1200000, rewardMin: 1900000, rewardMax: 3300000, duration: 72000000, tier: 4, levelReq: 7 },
    { name: 'Stock Buyback', cost: 2000000, rewardMin: 3200000, rewardMax: 5500000, duration: 86400000, tier: 4, levelReq: 7 },
    { name: 'Fortune 500 Campaign', cost: 5000000, rewardMin: 8000000, rewardMax: 14000000, duration: 129600000, tier: 5, levelReq: 9 },
    { name: 'Space Program', cost: 8000000, rewardMin: 12800000, rewardMax: 22000000, duration: 172800000, tier: 5, levelReq: 9 },
    { name: 'World Domination', cost: 10000000, rewardMin: 16000000, rewardMax: 28000000, duration: 216000000, tier: 5, levelReq: 9 },
    { name: 'Mega Merger', cost: 12000000, rewardMin: 19200000, rewardMax: 33000000, duration: 259200000, tier: 5, levelReq: 9 },
];

const TIER_NAMES = { 1: 'Starter', 2: 'Growing', 3: 'Established', 4: 'Corporate', 5: 'Empire' };

function getUpgradeCost(level) {
    const costs = {
        2: 50000, 3: 100000, 4: 200000, 5: 400000,
        6: 750000, 7: 1500000, 8: 3000000, 9: 6000000, 10: 10000000
    };
    return costs[level] || null;
}

module.exports = {
    data: {
        name: 'company',
        description: 'Create and manage companies',
        usage: ',company <subcommand> [args]'
    },
    cooldown: 5,

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        if (!sub) {
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Company System',
                    description: '**Subcommands:**\n`types` — View company types\n`create <type#> <name>` — Buy a company\n`info [@user]` — View company\n`join @owner` — Join a company\n`leave` — Leave your company\n`upgrade` — Level up your company\n`project start <#>` — Start a project\n`project collect` — Collect rewards\n`project cancel` — Cancel a project\n`project list` — View projects\n`project active` — View active projects\n`treasury <amount> <deposit|withdraw>` — Manage funds\n`members` — View members\n`leaderboard` — Top companies\n`delete` — Dissolve company'
                })]
            });
        }

        if (sub === 'types') {
            const list = COMPANY_TYPES.map((t, i) => {
                return `**${i + 1}. ${t.icon} ${t.name}**\nCost: $${t.cost.toLocaleString()} | Members: ${t.maxMembers} | Bonus: ${t.projectBonus}x`;
            }).join('\n\n');

            return message.reply({
                embeds: [createEmbed({
                    color: 0xfbbf24,
                    title: 'Company Types',
                    description: list,
                    footer: { text: 'Use ,company create <type#> <name> to buy' }
                })]
            });
        }

        if (sub === 'create') {
            const typeIdx = parseInt(args[1]) - 1;
            if (isNaN(typeIdx) || typeIdx < 0 || typeIdx >= COMPANY_TYPES.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Type', 'Use `,company types` to see options.')] });
            }

            const name = args.slice(2).join(' ');
            if (!name) return message.reply({ embeds: [errorEmbed('Usage', ',company create <type#> <name>')] });

            const type = COMPANY_TYPES[typeIdx];
            const user = getUser(message.author.id);
            if (user.wallet < type.cost) {
                return message.reply({ embeds: [errorEmbed('Not Enough', `**${type.icon} ${type.name}** costs **$${type.cost.toLocaleString()}**.\nYou have: **$${user.wallet.toLocaleString()}**`)] });
            }

            const existing = getCompany(message.author.id) || getCompanyByMember(message.author.id);
            if (existing) return message.reply({ embeds: [errorEmbed('Already in Company', 'Leave your current company first.')] });

            updateWallet(message.author.id, -type.cost);
            createCompany(message.author.id, name, type.id);

            return message.reply({
                embeds: [createEmbed({
                    color: type.color,
                    title: 'Company Created!',
                    description: `**${type.icon} ${name}** (${type.name})\n\nCost: **$${type.cost.toLocaleString()}**\nMembers: **${type.maxMembers}**\nProject Bonus: **${type.projectBonus}x**`
                })]
            });
        }

        if (sub === 'info') {
            const target = message.mentions.users.first() || message.author;
            const company = getCompany(target.id) || getCompanyByMember(target.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', `${target.tag} isn't in a company.`)] });

            const type = COMPANY_TYPES.find(t => t.id === company.type) || COMPANY_TYPES[0];
            const upgradeCost = company.level < 10 ? getUpgradeCost(company.level + 1) : null;
            const running = company.projects.filter(p => Date.now() < p.completesAt).length;
            const ready = company.projects.filter(p => Date.now() >= p.completesAt).length;

            return message.reply({
                embeds: [createEmbed({
                    color: type.color,
                    title: `${type.icon} ${company.name}`,
                    fields: [
                        { name: 'Type', value: type.name, inline: true },
                        { name: 'Level', value: `${company.level} — ${TIER_NAMES[Math.min(company.level, 5)]}`, inline: true },
                        { name: 'Members', value: `${company.members.length}/${company.maxMembers}`, inline: true },
                        { name: 'Treasury', value: `$${company.treasury.toLocaleString()}`, inline: true },
                        { name: 'Running', value: `${running}`, inline: true },
                        { name: 'Ready', value: `${ready}`, inline: true },
                        { name: 'Upgrade Cost', value: upgradeCost ? `$${upgradeCost.toLocaleString()}` : 'MAX', inline: true },
                        { name: 'Project Bonus', value: `${type.projectBonus}x`, inline: true }
                    ]
                })]
            });
        }

        if (sub === 'join') {
            const owner = message.mentions.users.first();
            if (!owner) return message.reply({ embeds: [errorEmbed('Usage', ',company join @owner')] });
            const company = getCompany(owner.id);
            if (!company) return message.reply({ embeds: [errorEmbed('Not Found', 'No company by that owner.')] });
            const existing = getCompanyByMember(message.author.id);
            if (existing) return message.reply({ embeds: [errorEmbed('Already in Company', 'Leave your current company first.')] });
            const result = addMember(owner.id, message.author.id);
            if (!result) return message.reply({ embeds: [errorEmbed('Full', 'Company is at max members.')] });
            return message.reply({ embeds: [successEmbed('Joined', `You joined **${company.name}**!`)] });
        }

        if (sub === 'leave') {
            const company = getCompanyByMember(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You aren\'t in a company.')] });
            if (company.members[0] === message.author.id) return message.reply({ embeds: [errorEmbed('Owner', 'You own this company. Use `,company delete` instead.')] });
            removeMember(company.members[0], message.author.id);
            return message.reply({ embeds: [successEmbed('Left', `You left **${company.name}**.`)] });
        }

        if (sub === 'upgrade') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });
            if (company.level >= 10) return message.reply({ embeds: [errorEmbed('Max Level', 'Your company is already at maximum level!')] });

            const nextLevel = company.level + 1;
            const cost = getUpgradeCost(nextLevel);
            const user = getUser(message.author.id);
            if (user.wallet < cost) {
                return message.reply({ embeds: [errorEmbed('Not Enough', `Upgrade to Level ${nextLevel} costs **$${cost.toLocaleString()}**.\nYou have: **$${user.wallet.toLocaleString()}**`)] });
            }

            updateWallet(message.author.id, -cost);
            upgradeCompany(message.author.id);
            const type = COMPANY_TYPES.find(t => t.id === company.type) || COMPANY_TYPES[0];

            return message.reply({
                embeds: [createEmbed({
                    color: type.color,
                    title: 'Company Upgraded!',
                    description: `**${company.name}** is now **Level ${nextLevel}**!\n\nMax Members: **${company.maxMembers + 2}**\nNew projects unlocked!`
                })]
            });
        }

        if (sub === 'project') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });
            const type = COMPANY_TYPES.find(t => t.id === company.type) || COMPANY_TYPES[0];

            const action = args[1]?.toLowerCase();

            if (action === 'list') {
                const available = PROJECTS.filter(p => p.levelReq <= company.level);
                const list = available.map((p, i) => {
                    const adjustedCost = Math.floor(p.cost / type.projectBonus);
                    return `**${i + 1}. ${p.name}** (Tier ${p.tier})\nCost: $${adjustedCost.toLocaleString()} | Reward: $${p.rewardMin.toLocaleString()}-$${p.rewardMax.toLocaleString()} | Time: ${p.duration / 60000}m`;
                }).join('\n\n');

                return message.reply({
                    embeds: [createEmbed({
                        color: type.color,
                        title: `${type.icon} Available Projects`,
                        description: list || 'No projects available at your level.',
                        footer: { text: `Company Bonus: ${type.projectBonus}x | Use ,project start <#> to begin` }
                    })]
                });
            }

            if (action === 'start') {
                const available = PROJECTS.filter(p => p.levelReq <= company.level);
                const idx = parseInt(args[2]) - 1;
                if (isNaN(idx) || idx < 0 || idx >= available.length) {
                    return message.reply({ embeds: [errorEmbed('Invalid Project', 'Use `,company project list` to see options.')] });
                }

                const project = available[idx];
                const adjustedCost = Math.floor(project.cost / type.projectBonus);

                if (company.treasury < adjustedCost) {
                    return message.reply({ embeds: [errorEmbed('Not Enough Treasury', `Need **$${adjustedCost.toLocaleString()}** in treasury.\nCurrent: **$${company.treasury.toLocaleString()}**`)] });
                }

                startProject(message.author.id, { ...project, cost: adjustedCost });
                return message.reply({
                    embeds: [createEmbed({
                        color: type.color,
                        title: 'Project Started',
                        description: `**${project.name}** (Tier ${project.tier})\n\nCost: **$${adjustedCost.toLocaleString()}**\nReward: **$${project.rewardMin.toLocaleString()}-$${project.rewardMax.toLocaleString()}**\nTime: **${project.duration / 60000} minutes**`
                    })]
                });
            }

            if (action === 'collect') {
                let totalReward = 0;
                let count = 0;
                for (const p of [...company.projects]) {
                    const result = collectProject(message.author.id, p.id);
                    if (result?.ready) { count++; totalReward += result.reward; }
                }
                if (count === 0) return message.reply({ embeds: [errorEmbed('Nothing Ready', 'No completed projects yet.')] });
                updateWallet(message.author.id, totalReward);
                return message.reply({
                    embeds: [createEmbed({
                        color: 0x22c55e,
                        title: 'Projects Collected',
                        description: `Collected **${count}** projects for **$${totalReward.toLocaleString()}**!`
                    })]
                });
            }

            if (action === 'cancel') {
                if (!company.projects.length) return message.reply({ embeds: [errorEmbed('Nothing to Cancel', 'No active projects.')] });
                const last = company.projects[company.projects.length - 1];
                const result = cancelProject(message.author.id, last.id);
                return message.reply({
                    embeds: [createEmbed({
                        color: 0xfbbf24,
                        title: 'Project Cancelled',
                        description: `Cancelled **${last.name}**. Refunded **$${result.refund.toLocaleString()}** (50%).`
                    })]
                });
            }

            if (action === 'active') {
                if (!company.projects.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Active Projects', description: 'None running.\nUse `,company project start <#>` to begin one.' })] });

                const now = Date.now();
                const list = company.projects.map(p => {
                    const remaining = Math.max(0, p.completesAt - now);
                    const status = remaining > 0 ? `⏳ ${Math.ceil(remaining / 60000)}m left` : '✅ Ready!';
                    return `**${p.name}** (Tier ${p.tier}) — ${status}\nReward: $${p.reward.toLocaleString()}`;
                }).join('\n\n');

                return message.reply({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: `Active Projects (${company.projects.length})`,
                        description: list
                    })]
                });
            }

            return message.reply({ embeds: [errorEmbed('Usage', ',company project <start|collect|cancel|list|active> [project#]')] });
        }

        if (sub === 'treasury') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });

            const amount = parseInt(args[1]);
            const action = args[2]?.toLowerCase();
            if (!amount || amount <= 0) return message.reply({ embeds: [errorEmbed('Usage', ',company treasury <amount> <deposit|withdraw>')] });

            if (action === 'deposit') {
                const user = getUser(message.author.id);
                if (user.wallet < amount) return message.reply({ embeds: [errorEmbed('Not Enough', 'Not enough in wallet.')] });
                updateWallet(message.author.id, -amount);
                company.treasury += amount;
                const { saveCompany } = require('../../utils/company');
                saveCompany({ companies: { [message.author.id]: company } });
                return message.reply({ embeds: [successEmbed('Deposited', `Added **$${amount.toLocaleString()}** to treasury.\nNew balance: **$${company.treasury.toLocaleString()}**`)] });
            }

            if (action === 'withdraw') {
                if (company.treasury < amount) return message.reply({ embeds: [errorEmbed('Not Enough', 'Not enough in treasury.')] });
                company.treasury -= amount;
                updateWallet(message.author.id, amount);
                const { saveCompany } = require('../../utils/company');
                saveCompany({ companies: { [message.author.id]: company } });
                return message.reply({ embeds: [successEmbed('Withdrawn', `Removed **$${amount.toLocaleString()}** from treasury.\nNew balance: **$${company.treasury.toLocaleString()}**`)] });
            }

            return message.reply({ embeds: [errorEmbed('Usage', ',company treasury <amount> <deposit|withdraw>')] });
        }

        if (sub === 'members') {
            const company = getCompany(message.author.id) || getCompanyByMember(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You aren\'t in a company.')] });
            const type = COMPANY_TYPES.find(t => t.id === company.type) || COMPANY_TYPES[0];
            const list = company.members.map((m, i) => `**${i + 1}.** <@${m}>${i === 0 ? ' (Owner)' : ''}`).join('\n');
            return message.reply({
                embeds: [createEmbed({
                    color: type.color,
                    title: `${type.icon} ${company.name} Members`,
                    description: `${list}\n\n**${company.members.length}/${company.maxMembers}** members`
                })]
            });
        }

        if (sub === 'leaderboard') {
            const data = require('../../utils/company').loadCompany();
            const entries = Object.entries(data.companies)
                .map(([id, c]) => {
                    const type = COMPANY_TYPES.find(t => t.id === c.type) || COMPANY_TYPES[0];
                    return { id, name: c.name, type, treasury: c.treasury, members: c.members.length, level: c.level };
                })
                .sort((a, b) => b.treasury - a.treasury)
                .slice(0, 20);

            if (!entries.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Company Leaderboard', description: 'No companies yet.' })] });

            const pages = [];
            for (let i = 0; i < entries.length; i += 10) {
                const chunk = entries.slice(i, i + 10);
                pages.push({
                    color: 0xfbbf24,
                    title: 'Company Leaderboard',
                    description: chunk.map((e, j) => `**${i + j + 1}.** ${e.type.icon} ${e.name} — Lv.${e.level} | $${e.treasury.toLocaleString()} | ${e.members} members`).join('\n')
                });
            }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }

        if (sub === 'delete') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });
            const type = COMPANY_TYPES.find(t => t.id === company.type) || COMPANY_TYPES[0];
            deleteCompany(message.author.id);
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Company Dissolved', description: `**${type.icon} ${company.name}** has been dissolved.` })] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Use `,company` to see all subcommands.')] });
    }
};
