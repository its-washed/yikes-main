const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getExperiments, startExperiment, collectExperiment, cancelExperiment } = require('../../utils/laboratory');
const { getUser, updateWallet } = require('../../utils/economy');
const { Paginator } = require('../../utils/pagination');

const RECIPES = [
    { name: 'Potion of Speed', cost: 1000, rewardMin: 1500, rewardMax: 3000, duration: 3600000 },
    { name: 'Elixir of Wealth', cost: 2500, rewardMin: 3500, rewardMax: 6000, duration: 7200000 },
    { name: 'Philosopher Stone', cost: 5000, rewardMin: 7000, rewardMax: 12000, duration: 14400000 },
    { name: 'Dragon Elixir', cost: 10000, rewardMin: 15000, rewardMax: 25000, duration: 28800000 },
    { name: 'Mystic Brew', cost: 750, rewardMin: 1000, rewardMax: 2000, duration: 1800000 },
];

module.exports = {
    data: {
        name: 'laboratory',
        description: 'Run experiments for rewards',
        usage: ',laboratory <start|collect|cancel|recipes|active> [args]'
    },
    aliases: ['lab'],
    cooldown: 5,

    async execute(message, args, client, config) {
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `start`, `collect`, `cancel`, `recipes`, `active`')] });

        if (sub === 'recipes') {
            const list = RECIPES.map((r, i) => `**${i + 1}.** ${r.name} — Cost: $${r.cost.toLocaleString()} | Reward: $${r.rewardMin.toLocaleString()}-$${r.rewardMax.toLocaleString()} | Time: ${r.duration / 60000}m`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Lab Recipes', description: list })] });
        }

        if (sub === 'start') {
            const recipeIdx = parseInt(args[1]) - 1;
            if (recipeIdx < 0 || recipeIdx >= RECIPES.length) {
                return message.reply({ embeds: [errorEmbed('Invalid Recipe', 'Use `,laboratory recipes` to see options.')] });
            }
            const recipe = RECIPES[recipeIdx];
            const user = getUser(message.author.id);
            if (user.wallet < recipe.cost) {
                return message.reply({ embeds: [errorEmbed('Not Enough', `Need **$${recipe.cost.toLocaleString()}** to start.`)] });
            }
            updateWallet(message.author.id, -recipe.cost);
            const exp = startExperiment(message.author.id, recipe.name, recipe.cost);
            return message.reply({ embeds: [successEmbed('Experiment Started', `**${recipe.name}** is now running.\nCompletes in **${recipe.duration / 60000}** minutes.`)] });
        }

        if (sub === 'collect') {
            const exps = getExperiments(message.author.id);
            if (!exps.length) return message.reply({ embeds: [errorEmbed('No Experiments', 'Start one with `,laboratory start <recipe>`')] });

            let collected = 0;
            let totalReward = 0;
            for (const exp of [...exps]) {
                const result = collectExperiment(message.author.id, exp.id);
                if (result && result.ready) {
                    collected++;
                    totalReward += result.reward;
                }
            }

            if (collected === 0) return message.reply({ embeds: [errorEmbed('Not Ready', 'None of your experiments are done yet.')] });
            updateWallet(message.author.id, totalReward);
            return message.reply({ embeds: [successEmbed('Collected', `Collected **${collected}** experiment(s) for **$${totalReward.toLocaleString()}**!`)] });
        }

        if (sub === 'cancel') {
            const exps = getExperiments(message.author.id);
            if (!exps.length) return message.reply({ embeds: [errorEmbed('Nothing to Cancel', 'No active experiments.')] });
            const last = exps[exps.length - 1];
            cancelExperiment(message.author.id, last.id);
            const refund = Math.floor(last.cost * 0.5);
            updateWallet(message.author.id, refund);
            return message.reply({ embeds: [successEmbed('Cancelled', `Cancelled **${last.name}**. Refunded **$${refund.toLocaleString()}**.`)] });
        }

        if (sub === 'active') {
            const exps = getExperiments(message.author.id);
            if (!exps.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Active Experiments', description: 'None running.' })] });

            const now = Date.now();
            const list = exps.map(e => {
                const remaining = Math.max(0, e.completesAt - now);
                const status = remaining > 0 ? `${Math.ceil(remaining / 60000)}m left` : 'Ready!';
                return `**${e.name}** — ${status} | Reward: $${e.reward.toLocaleString()}`;
            }).join('\n');

            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Active Experiments (${exps.length})`, description: list })] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `start`, `collect`, `cancel`, `recipes`, `active`')] });
    }
};
