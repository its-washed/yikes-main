const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getBusiness, createBusiness, upgradeBusiness, hireEmployee, collectIncome, deleteBusiness } = require('../../utils/business');
const { getUser, updateWallet } = require('../../utils/economy');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'business',
        description: 'Manage your business',
        usage: ',business <create|info|upgrade|hire|collect|delete|leaderboard> [args]'
    },
    aliases: ['biz'],
    cooldown: 10,

    async execute(message, args, client, config) {
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `create`, `info`, `upgrade`, `hire`, `collect`, `delete`, `leaderboard`')] });

        if (sub === 'create') {
            const name = args.slice(1, -1).join(' ');
            const type = args[args.length - 1]?.toLowerCase();
            if (!name || !type) return message.reply({ embeds: [errorEmbed('Usage', ',business create <name> <type>\nTypes: `restaurant`, `tech`, `retail`, `media`, `fitness`')] });

            const bizTypes = { restaurant: 5000, tech: 10000, retail: 3000, media: 7500, fitness: 4000 };
            const cost = bizTypes[type];
            if (!cost) return message.reply({ embeds: [errorEmbed('Invalid Type', 'Valid: `restaurant`, `tech`, `retail`, `media`, `fitness`')] });

            const user = getUser(message.author.id);
            if (user.wallet < cost) return message.reply({ embeds: [errorEmbed('Not Enough', `You need **$${cost.toLocaleString()}** to start a ${type} business.`)] });

            const existing = getBusiness(message.author.id);
            if (existing) return message.reply({ embeds: [errorEmbed('Already Owned', 'You already have a business. Delete it first.')] });

            updateWallet(message.author.id, -cost);
            createBusiness(message.author.id, name, type);
            return message.reply({ embeds: [successEmbed('Business Created', `**${name}** (${type}) is now yours!\nCost: $${cost.toLocaleString()}`)] });
        }

        if (sub === 'info') {
            const target = message.mentions.users.first() || message.author;
            const biz = getBusiness(target.id);
            if (!biz) return message.reply({ embeds: [errorEmbed('No Business', `${target.tag} doesn't own a business.`)] });
            const profit = biz.income - biz.upkeep;
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: biz.name,
                    fields: [
                        { name: 'Type', value: biz.type, inline: true },
                        { name: 'Level', value: `${biz.level}`, inline: true },
                        { name: 'Employees', value: `${biz.employees}`, inline: true },
                        { name: 'Income', value: `$${biz.income.toLocaleString()}`, inline: true },
                        { name: 'Upkeep', value: `$${biz.upkeep.toLocaleString()}`, inline: true },
                        { name: 'Profit', value: `$${profit.toLocaleString()}`, inline: true },
                        { name: 'Total Earned', value: `$${biz.totalEarned.toLocaleString()}`, inline: true }
                    ]
                })]
            });
        }

        if (sub === 'upgrade') {
            const biz = getBusiness(message.author.id);
            if (!biz) return message.reply({ embeds: [errorEmbed('No Business', 'Create a business first.')] });
            const cost = biz.level * 2000;
            const user = getUser(message.author.id);
            if (user.wallet < cost) return message.reply({ embeds: [errorEmbed('Not Enough', `Upgrade costs **$${cost.toLocaleString()}**.`)] });
            updateWallet(message.author.id, -cost);
            upgradeBusiness(message.author.id);
            return message.reply({ embeds: [successEmbed('Upgraded', `**${biz.name}** is now level **${biz.level + 1}**!`)] });
        }

        if (sub === 'hire') {
            const biz = getBusiness(message.author.id);
            if (!biz) return message.reply({ embeds: [errorEmbed('No Business', 'Create a business first.')] });
            const cost = 500;
            const user = getUser(message.author.id);
            if (user.wallet < cost) return message.reply({ embeds: [errorEmbed('Not Enough', `Hiring costs **$${cost.toLocaleString()}**.`)] });
            updateWallet(message.author.id, -cost);
            hireEmployee(message.author.id);
            return message.reply({ embeds: [successEmbed('Hired', `**${biz.name}** now has **${biz.employees + 1}** employees!`)] });
        }

        if (sub === 'collect') {
            const result = collectIncome(message.author.id);
            if (!result) return message.reply({ embeds: [errorEmbed('No Business', 'Create a business first.')] });
            const { profit } = result;
            if (profit <= 0) return message.reply({ embeds: [errorEmbed('No Profit', `Your business is breaking even or losing money.`)] });
            updateWallet(message.author.id, profit);
            return message.reply({ embeds: [successEmbed('Collected', `You earned **$${profit.toLocaleString()}** from **${result.biz.name}**!`)] });
        }

        if (sub === 'delete') {
            const biz = getBusiness(message.author.id);
            if (!biz) return message.reply({ embeds: [errorEmbed('No Business', 'You don\'t own a business.')] });
            deleteBusiness(message.author.id);
            return message.reply({ embeds: [successEmbed('Deleted', `**${biz.name}** has been shut down.`)] });
        }

        if (sub === 'leaderboard') {
            const { loadBiz } = require('../../utils/business');
            const data = loadBiz();
            const entries = Object.entries(data.businesses)
                .map(([id, b]) => ({ id, ...b }))
                .sort((a, b) => b.totalEarned - a.totalEarned)
                .slice(0, 20);

            if (!entries.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Business Leaderboard', description: 'No businesses yet.' })] });

            const pages = [];
            for (let i = 0; i < entries.length; i += 10) {
                const chunk = entries.slice(i, i + 10);
                pages.push({
                    color: 0x6c5ce7,
                    title: 'Business Leaderboard',
                    description: chunk.map((e, j) => `**${i + j + 1}.** <@${e.id}> — **${e.name}** ($${e.totalEarned.toLocaleString()})`).join('\n')
                });
            }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    }
};
