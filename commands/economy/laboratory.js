const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getExperiments, startExperiment, collectExperiment, cancelExperiment, getLab, createLab, upgradeLab, getUpgradeCost } = require('../../utils/laboratory');
const { getUser, updateWallet } = require('../../utils/economy');

const LAB_COST = 10000000;

const RECIPES = [
    { name: 'Mystic Brew', cost: 1000, rewardMin: 1500, rewardMax: 3000, duration: 1800000, tier: 1, levelReq: 1 },
    { name: 'Potion of Speed', cost: 2500, rewardMin: 3500, rewardMax: 6000, duration: 3600000, tier: 1, levelReq: 1 },
    { name: 'Herbal Tonic', cost: 1500, rewardMin: 2000, rewardMax: 4000, duration: 2400000, tier: 1, levelReq: 1 },
    { name: 'Elixir of Wealth', cost: 8000, rewardMin: 10000, rewardMax: 18000, duration: 7200000, tier: 2, levelReq: 2 },
    { name: 'Shadow Serum', cost: 6000, rewardMin: 8000, rewardMax: 14000, duration: 5400000, tier: 2, levelReq: 2 },
    { name: 'Fire Water', cost: 10000, rewardMin: 13000, rewardMax: 22000, duration: 9000000, tier: 2, levelReq: 2 },
    { name: 'Philosopher Stone', cost: 25000, rewardMin: 35000, rewardMax: 60000, duration: 14400000, tier: 3, levelReq: 3 },
    { name: 'Frozen Essence', cost: 20000, rewardMin: 28000, rewardMax: 48000, duration: 10800000, tier: 3, levelReq: 3 },
    { name: 'Toxic Extract', cost: 30000, rewardMin: 42000, rewardMax: 70000, duration: 18000000, tier: 3, levelReq: 3 },
    { name: 'Dragon Elixir', cost: 75000, rewardMin: 100000, rewardMax: 180000, duration: 28800000, tier: 4, levelReq: 4 },
    { name: 'Phoenix Ash', cost: 60000, rewardMin: 82000, rewardMax: 140000, duration: 21600000, tier: 4, levelReq: 4 },
    { name: 'Void Liquid', cost: 90000, rewardMin: 125000, rewardMax: 210000, duration: 36000000, tier: 4, levelReq: 4 },
    { name: 'Celestial Dew', cost: 200000, rewardMin: 280000, rewardMax: 480000, duration: 43200000, tier: 5, levelReq: 5 },
    { name: 'Demon Blood', cost: 180000, rewardMin: 250000, rewardMax: 420000, duration: 36000000, tier: 5, levelReq: 5 },
    { name: 'Ambrosia', cost: 250000, rewardMin: 350000, rewardMax: 600000, duration: 54000000, tier: 5, levelReq: 5 },
    { name: 'Leviathan Ichor', cost: 500000, rewardMin: 700000, rewardMax: 1200000, duration: 64800000, tier: 6, levelReq: 6 },
    { name: 'Starlight Serum', cost: 450000, rewardMin: 620000, rewardMax: 1050000, duration: 54000000, tier: 6, levelReq: 6 },
    { name: 'Frozen Star', cost: 600000, rewardMin: 850000, rewardMax: 1400000, duration: 72000000, tier: 6, levelReq: 6 },
    { name: 'World Ender', cost: 1200000, rewardMin: 1700000, rewardMax: 2800000, duration: 86400000, tier: 7, levelReq: 7 },
    { name: 'God Serum', cost: 1000000, rewardMin: 1400000, rewardMax: 2400000, duration: 72000000, tier: 7, levelReq: 7 },
    { name: 'Astral Essence', cost: 1500000, rewardMin: 2100000, rewardMax: 3500000, duration: 100800000, tier: 7, levelReq: 7 },
    { name: 'Omega Potion', cost: 3000000, rewardMin: 4200000, rewardMax: 7000000, duration: 115200000, tier: 8, levelReq: 8 },
    { name: 'Cosmic Brew', cost: 2500000, rewardMin: 3500000, rewardMax: 5800000, duration: 86400000, tier: 8, levelReq: 8 },
    { name: 'Singularity Core', cost: 4000000, rewardMin: 5500000, rewardMax: 9000000, duration: 129600000, tier: 8, levelReq: 8 },
    { name: 'Unobtainium', cost: 8000000, rewardMin: 11000000, rewardMax: 18000000, duration: 172800000, tier: 9, levelReq: 9 },
    { name: 'Eternity Elixir', cost: 7000000, rewardMin: 9500000, rewardMax: 16000000, duration: 144000000, tier: 9, levelReq: 9 },
    { name: 'Dark Matter', cost: 10000000, rewardMin: 14000000, rewardMax: 23000000, duration: 201600000, tier: 9, levelReq: 9 },
    { name: 'Philosopher Universe', cost: 25000000, rewardMin: 35000000, rewardMax: 60000000, duration: 259200000, tier: 10, levelReq: 10 },
    { name: 'Immortality Serum', cost: 20000000, rewardMin: 28000000, rewardMax: 48000000, duration: 216000000, tier: 10, levelReq: 10 },
    { name: 'Genesis Stone', cost: 30000000, rewardMin: 42000000, rewardMax: 72000000, duration: 302400000, tier: 10, levelReq: 10 },
];

const TIER_NAMES = {
    1: 'Apprentice', 2: 'Adept', 3: 'Expert', 4: 'Master', 5: 'Grandmaster',
    6: 'Legend', 7: 'Mythic', 8: 'Transcendent', 9: 'Divine', 10: 'Celestial'
};

const TIER_COLORS = {
    1: 0x95a5a6, 2: 0x3498db, 3: 0x2ecc71, 4: 0xe67e22, 5: 0xe74c3c,
    6: 0x9b59b6, 7: 0xf1c40f, 8: 0x1abc9c, 9: 0x34495e, 10: 0xff6b6b
};

module.exports = {
    data: {
        name: 'laboratory',
        description: 'Run experiments for massive rewards',
        usage: ',laboratory <subcommand> [args]'
    },
    aliases: ['lab'],
    cooldown: 5,

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        if (!sub) {
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Laboratory',
                    description: '**Subcommands:**\n`buy` — Purchase a lab ($10M)\n`upgrade` — Level up your lab\n`info` — View your lab status\n`recipes` — View available experiments\n`start <recipe>` — Start an experiment\n`collect` — Collect finished experiments\n`cancel` — Cancel last experiment\n`active` — View active experiments'
                })]
            });
        }

        if (sub === 'buy') {
            const lab = getLab(message.author.id);
            if (lab) return message.reply({ embeds: [errorEmbed('Already Owned', 'You already own a laboratory! Use `,lab upgrade` to level it up.')] });

            const user = getUser(message.author.id);
            if (user.wallet < LAB_COST) {
                return message.reply({ embeds: [errorEmbed('Not Enough', `A lab costs **$${LAB_COST.toLocaleString()}**.\nYou have: **$${user.wallet.toLocaleString()}**`)] });
            }

            updateWallet(message.author.id, -LAB_COST);
            createLab(message.author.id);

            return message.reply({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: 'Lab Purchased!',
                    description: `You bought a **Tier 1 ${TIER_NAMES[1]} Laboratory** for **$${LAB_COST.toLocaleString()}**!\n\nUse \`<lab recipes\` to see what you can experiment with.`
                })]
            });
        }

        if (sub === 'upgrade') {
            const lab = getLab(message.author.id);
            if (!lab) return message.reply({ embeds: [errorEmbed('No Lab', 'You don\'t own a lab. Use `,lab buy` to purchase one.')] });
            if (lab.level >= 10) return message.reply({ embeds: [errorEmbed('Max Level', 'Your lab is already at maximum level!')] });

            const nextLevel = lab.level + 1;
            const cost = getUpgradeCost(nextLevel);
            const user = getUser(message.author.id);

            if (user.wallet < cost) {
                return message.reply({ embeds: [errorEmbed('Not Enough', `Upgrade to Level ${nextLevel} costs **$${cost.toLocaleString()}**.\nYou have: **$${user.wallet.toLocaleString()}**`)] });
            }

            updateWallet(message.author.id, -cost);
            upgradeLab(message.author.id);

            return message.reply({
                embeds: [createEmbed({
                    color: TIER_COLORS[nextLevel],
                    title: 'Lab Upgraded!',
                    description: `Your lab is now **Level ${nextLevel} — ${TIER_NAMES[nextLevel]}**!\n\nNew recipes unlocked! Use \`<lab recipes\` to see them.`
                })]
            });
        }

        if (sub === 'info') {
            const lab = getLab(message.author.id);
            if (!lab) return message.reply({ embeds: [errorEmbed('No Lab', 'You don\'t own a lab. Use `,lab buy` to purchase one.')] });

            const upgradeCost = lab.level < 10 ? getUpgradeCost(lab.level + 1) : null;
            const exps = getExperiments(message.author.id);
            const running = exps.filter(e => Date.now() < e.completesAt).length;
            const ready = exps.filter(e => Date.now() >= e.completesAt).length;
            const recipesAvailable = RECIPES.filter(r => r.levelReq <= lab.level).length;

            return message.reply({
                embeds: [createEmbed({
                    color: TIER_COLORS[lab.level],
                    title: 'Laboratory Info',
                    fields: [
                        { name: 'Level', value: `${lab.level} — ${TIER_NAMES[lab.level]}`, inline: true },
                        { name: 'Recipes Unlocked', value: `${recipesAvailable}/${RECIPES.length}`, inline: true },
                        { name: 'Running', value: `${running}`, inline: true },
                        { name: 'Ready to Collect', value: `${ready}`, inline: true },
                        { name: 'Upgrade Cost', value: upgradeCost ? `$${upgradeCost.toLocaleString()}` : 'MAX', inline: true }
                    ]
                })]
            });
        }

        if (sub === 'recipes') {
            const lab = getLab(message.author.id);
            const labLevel = lab ? lab.level : 0;

            const tiers = {};
            for (const r of RECIPES) {
                if (!tiers[r.tier]) tiers[r.tier] = [];
                tiers[r.tier].push(r);
            }

            const pages = [];
            for (const tier of Object.keys(tiers).sort((a, b) => a - b)) {
                const t = parseInt(tier);
                const locked = t > labLevel;
                const list = tiers[t].map((r, i) => {
                    const status = locked ? '🔒' : '✅';
                    return `${status} **${r.name}**\nCost: $${r.cost.toLocaleString()} | Reward: $${r.rewardMin.toLocaleString()}-$${r.rewardMax.toLocaleString()} | Time: ${r.duration / 60000}m`;
                }).join('\n\n');

                pages.push({
                    color: TIER_COLORS[t],
                    title: `Tier ${t} — ${TIER_NAMES[t]}${locked ? ' 🔒' : ''}`,
                    description: locked ? `Reach **Level ${t}** to unlock.\n\n${list}` : list,
                    footer: { text: locked ? `Requires Lab Level ${t}` : `Use ,lab start <recipe number> to begin` }
                });
            }

            if (labLevel === 0) {
                return message.reply({
                    embeds: [createEmbed({
                        color: 0xff4757,
                        title: 'No Lab',
                        description: 'You don\'t own a lab! Use `,lab buy` to purchase one for **$10,000,000**.'
                    })]
                });
            }

            let page = 0;
            const msg = await message.reply({ embeds: [pages[page]] });

            await msg.react('⬅️');
            await msg.react('➡️');

            const filter = (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
            const collector = msg.createReactionCollector({ filter, time: 60000 });

            collector.on('collect', (reaction) => {
                reaction.users.remove(message.author);
                if (reaction.emoji.name === '➡️' && page < pages.length - 1) page++;
                if (reaction.emoji.name === '⬅️' && page > 0) page--;
                msg.edit({ embeds: [pages[page]] });
            });

            collector.on('end', () => msg.reactions.removeAll().catch(() => {}));
            return;
        }

        if (sub === 'start') {
            const lab = getLab(message.author.id);
            if (!lab) return message.reply({ embeds: [errorEmbed('No Lab', 'You don\'t own a lab. Use `,lab buy` to purchase one.')] });

            const recipeIdx = parseInt(args[1]) - 1;
            if (isNaN(recipeIdx) || recipeIdx < 0 || recipeIdx >= RECIPES.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Recipe', 'Use `,lab recipes` to see available experiments.')] });
            }

            const recipe = RECIPES[recipeIdx];

            if (recipe.levelReq > lab.level) {
                return message.reply({ embeds: [errorEmbed('Locked', `You need **Lab Level ${recipe.levelReq}** to run **${recipe.name}**.\nYour lab is Level ${lab.level}.`)] });
            }

            const user = getUser(message.author.id);
            if (user.wallet < recipe.cost) {
                return message.reply({ embeds: [errorEmbed('Not Enough', `Need **$${recipe.cost.toLocaleString()}** to start this experiment.\nYou have: **$${user.wallet.toLocaleString()}**`)] });
            }

            updateWallet(message.author.id, -recipe.cost);
            const exp = startExperiment(message.author.id, recipe);

            return message.reply({
                embeds: [createEmbed({
                    color: TIER_COLORS[recipe.tier],
                    title: 'Experiment Started',
                    description: `**${recipe.name}** (Tier ${recipe.tier})\n\nCost: **$${recipe.cost.toLocaleString()}**\nReward: **$${recipe.rewardMin.toLocaleString()}-$${recipe.rewardMax.toLocaleString()}**\nTime: **${recipe.duration / 60000} minutes**`
                })]
            });
        }

        if (sub === 'collect') {
            const exps = getExperiments(message.author.id);
            if (!exps.length) return message.reply({ embeds: [errorEmbed('No Experiments', 'Start one with `,lab start <recipe>`')] });

            let collected = 0;
            let totalReward = 0;
            for (const exp of [...exps]) {
                const result = collectExperiment(message.author.id, exp.id);
                if (result && result.ready) {
                    collected++;
                    totalReward += result.reward;
                }
            }

            if (collected === 0) return message.reply({ embeds: [errorEmbed('Not Ready', 'None of your experiments are done yet. Use `,lab active` to check progress.')] });

            updateWallet(message.author.id, totalReward);
            return message.reply({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: 'Experiments Collected',
                    description: `Collected **${collected}** experiment(s) for **$${totalReward.toLocaleString()}**!`
                })]
            });
        }

        if (sub === 'cancel') {
            const exps = getExperiments(message.author.id);
            if (!exps.length) return message.reply({ embeds: [errorEmbed('Nothing to Cancel', 'No active experiments.')] });
            const last = exps[exps.length - 1];
            cancelExperiment(message.author.id, last.id);
            const refund = Math.floor(last.cost * 0.5);
            updateWallet(message.author.id, refund);
            return message.reply({
                embeds: [createEmbed({
                    color: 0xfbbf24,
                    title: 'Experiment Cancelled',
                    description: `Cancelled **${last.name}**. Refunded **$${refund.toLocaleString()}** (50%).`
                })]
            });
        }

        if (sub === 'active') {
            const exps = getExperiments(message.author.id);
            if (!exps.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Active Experiments', description: 'None running.\nUse `,lab start <recipe>` to begin one.' })] });

            const now = Date.now();
            const list = exps.map(e => {
                const remaining = Math.max(0, e.completesAt - now);
                const status = remaining > 0 ? `⏳ ${Math.ceil(remaining / 60000)}m left` : '✅ Ready!';
                return `**${e.name}** (Tier ${e.tier}) — ${status}\nReward: $${e.reward.toLocaleString()}`;
            }).join('\n\n');

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: `Active Experiments (${exps.length})`,
                    description: list
                })]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Subcommand', 'Valid: `buy`, `upgrade`, `info`, `recipes`, `start`, `collect`, `cancel`, `active`')] });
    }
};
