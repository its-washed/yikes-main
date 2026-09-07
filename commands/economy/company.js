const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getCompany, getCompanyByMember, createCompany, addMember, removeMember, upgradeCompany, startProject, collectProject, deleteCompany } = require('../../utils/company');
const { getUser, updateWallet } = require('../../utils/economy');
const { Paginator } = require('../../utils/pagination');

const PROJECTS = [
    { name: 'Marketing Campaign', cost: 2000, rewardMin: 4000, rewardMax: 8000 },
    { name: 'Product Launch', cost: 5000, rewardMin: 10000, rewardMax: 20000 },
    { name: 'Research Initiative', cost: 10000, rewardMin: 25000, rewardMax: 40000 },
    { name: 'Expansion Plan', cost: 15000, rewardMin: 35000, rewardMax: 60000 },
];

module.exports = {
    data: {
        name: 'company',
        description: 'Create and manage companies',
        usage: ',company <create|info|join|leave|upgrade|project|treasury|members|leaderboard|delete> [args]'
    },
    cooldown: 10,

    async execute(message, args, client, config) {
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `create`, `info`, `join`, `leave`, `upgrade`, `project`, `treasury`, `members`, `leaderboard`, `delete`')] });

        if (sub === 'create') {
            const name = args.slice(1).join(' ');
            if (!name) return message.reply({ embeds: [errorEmbed('Usage', ',company create <name>')] });
            const cost = 10000;
            const user = getUser(message.author.id);
            if (user.wallet < cost) return message.reply({ embeds: [errorEmbed('Not Enough', `Need **$${cost.toLocaleString()}** to create a company.`)] });
            const existing = getCompany(message.author.id) || getCompanyByMember(message.author.id);
            if (existing) return message.reply({ embeds: [errorEmbed('Already in Company', 'Leave your current company first.')] });
            updateWallet(message.author.id, -cost);
            createCompany(message.author.id, name);
            return message.reply({ embeds: [successEmbed('Company Created', `**${name}** is now yours!`)] });
        }

        if (sub === 'info') {
            const target = message.mentions.users.first() || message.author;
            const company = getCompany(target.id) || getCompanyByMember(target.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', `${target.tag} isn't in a company.`)] });
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: company.name,
                    fields: [
                        { name: 'Level', value: `${company.level}`, inline: true },
                        { name: 'Members', value: `${company.members.length}/${company.maxMembers}`, inline: true },
                        { name: 'Treasury', value: `$${company.treasury.toLocaleString()}`, inline: true },
                        { name: 'Projects', value: `${company.projects.length} active`, inline: true }
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
            const cost = company.level * 5000;
            const user = getUser(message.author.id);
            if (user.wallet < cost) return message.reply({ embeds: [errorEmbed('Not Enough', `Upgrade costs **$${cost.toLocaleString()}**.`)] });
            updateWallet(message.author.id, -cost);
            upgradeCompany(message.author.id);
            return message.reply({ embeds: [successEmbed('Upgraded', `**${company.name}** is now level **${company.level + 1}**!`)] });
        }

        if (sub === 'project') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });

            const action = args[1]?.toLowerCase();
            if (action === 'start') {
                const idx = parseInt(args[2]) - 1;
                if (idx < 0 || idx >= PROJECTS.length) return message.reply({ embeds: [errorEmbed('Invalid', 'Use `,company project list` to see options.')] });
                const project = PROJECTS[idx];
                if (company.treasury < project.cost) return message.reply({ embeds: [errorEmbed('Not Enough', `Need **$${project.cost.toLocaleString()}** in treasury.`)] });
                startProject(message.author.id, project.name, project.cost);
                return message.reply({ embeds: [successEmbed('Project Started', `**${project.name}** is now running.`)] });
            }

            if (action === 'collect') {
                let totalReward = 0;
                let count = 0;
                for (const p of [...company.projects]) {
                    const result = collectProject(message.author.id, p.id);
                    if (result?.ready) { count++; totalReward += result.reward; }
                }
                if (count === 0) return message.reply({ embeds: [errorEmbed('Nothing Ready', 'No completed projects.')] });
                updateWallet(message.author.id, totalReward);
                return message.reply({ embeds: [successEmbed('Collected', `Collected **${count}** projects for **$${totalReward.toLocaleString()}**!`)] });
            }

            if (action === 'list') {
                const list = PROJECTS.map((p, i) => `**${i + 1}.** ${p.name} — Cost: $${p.cost.toLocaleString()} | Reward: $${p.rewardMin.toLocaleString()}-$${p.rewardMax.toLocaleString()}`).join('\n');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Projects', description: list })] });
            }

            if (action === 'active') {
                const now = Date.now();
                const list = company.projects.map(p => {
                    const remaining = Math.max(0, p.completesAt - now);
                    return `**${p.name}** — ${remaining > 0 ? `${Math.ceil(remaining / 60000)}m left` : 'Ready!'} | Reward: $${p.reward.toLocaleString()}`;
                }).join('\n') || 'None active.';
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Active Projects', description: list })] });
            }

            return message.reply({ embeds: [errorEmbed('Usage', ',company project <start|collect|list|active> [recipe#]')] });
        }

        if (sub === 'treasury') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });
            const amount = parseInt(args[1]);
            const action = args[2]?.toLowerCase();
            if (!amount) return message.reply({ embeds: [errorEmbed('Usage', ',company treasury <amount> <deposit|withdraw>')] });
            if (action === 'deposit') {
                const user = getUser(message.author.id);
                if (user.wallet < amount) return message.reply({ embeds: [errorEmbed('Not Enough', 'Not enough in wallet.')] });
                updateWallet(message.author.id, -amount);
                company.treasury += amount;
                const { saveCompany } = require('../../utils/company');
                saveCompany({ companies: { [message.author.id]: company } });
                return message.reply({ embeds: [successEmbed('Deposited', `Added **$${amount.toLocaleString()}** to treasury.`)] });
            }
            if (action === 'withdraw') {
                if (company.treasury < amount) return message.reply({ embeds: [errorEmbed('Not Enough', 'Not enough in treasury.')] });
                company.treasury -= amount;
                updateWallet(message.author.id, amount);
                const { saveCompany } = require('../../utils/company');
                saveCompany({ companies: { [message.author.id]: company } });
                return message.reply({ embeds: [successEmbed('Withdrawn', `Removed **$${amount.toLocaleString()}** from treasury.`)] });
            }
            return message.reply({ embeds: [errorEmbed('Usage', ',company treasury <amount> <deposit|withdraw>')] });
        }

        if (sub === 'members') {
            const company = getCompany(message.author.id) || getCompanyByMember(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You aren\'t in a company.')] });
            const list = company.members.map((m, i) => `**${i + 1}.** <@${m}>`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${company.name} Members`, description: list })] });
        }

        if (sub === 'leaderboard') {
            const data = require('../../utils/company').loadCompany();
            const entries = Object.entries(data.companies)
                .map(([id, c]) => ({ id, name: c.name, treasury: c.treasury, members: c.members.length, level: c.level }))
                .sort((a, b) => b.treasury - a.treasury)
                .slice(0, 20);

            if (!entries.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Company Leaderboard', description: 'No companies yet.' })] });

            const pages = [];
            for (let i = 0; i < entries.length; i += 10) {
                const chunk = entries.slice(i, i + 10);
                pages.push({
                    color: 0x6c5ce7,
                    title: 'Company Leaderboard',
                    description: chunk.map((e, j) => `**${i + j + 1}.** ${e.name} — Lv.${e.level} | $${e.treasury.toLocaleString()} | ${e.members} members`).join('\n')
                });
            }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }

        if (sub === 'delete') {
            const company = getCompany(message.author.id);
            if (!company) return message.reply({ embeds: [errorEmbed('No Company', 'You don\'t own a company.')] });
            deleteCompany(message.author.id);
            return message.reply({ embeds: [successEmbed('Deleted', `**${company.name}** has been dissolved.`)] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    }
};
