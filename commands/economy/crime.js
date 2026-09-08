const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

const crimes = [
    { name: 'Pickpocketing', minWin: 20, maxWin: 150, failChance: 0.35, failFine: 50 },
    { name: 'Shoplifting', minWin: 30, maxWin: 200, failChance: 0.3, failFine: 100 },
    { name: 'Bank Robbery', minWin: 200, maxWin: 2000, failChance: 0.6, failFine: 500 },
    { name: 'Identity Theft', minWin: 100, maxWin: 800, failChance: 0.4, failFine: 200 },
    { name: 'Car Theft', minWin: 150, maxWin: 1200, failChance: 0.5, failFine: 350 },
    { name: 'Drug Dealing', minWin: 50, maxWin: 600, failChance: 0.45, failFine: 150 },
    { name: 'Arson', minWin: 300, maxWin: 3000, failChance: 0.7, failFine: 800 },
    { name: 'Vandalism', minWin: 10, maxWin: 80, failChance: 0.2, failFine: 30 },
    { name: 'Tax Evasion', minWin: 500, maxWin: 5000, failChance: 0.65, failFine: 1000 },
    { name: 'Burglary', minWin: 80, maxWin: 500, failChance: 0.35, failFine: 120 },
];

module.exports = {
    data: { name: 'crime', description: 'Commit a crime for money (risky!)', usage: ',crime' },
    aliases: [],
    cooldown: 120,
    async execute(message) {
        const user = getUser(message.author.id);

        const crime = crimes[Math.floor(Math.random() * crimes.length)];
        const failed = Math.random() < crime.failChance;

        if (failed) {
            const fine = Math.min(crime.failFine, user.wallet);
            updateWallet(message.author.id, -fine);

            return message.reply({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: 'Crime Failed!',
                    description: `You were caught **${crime.name}**!\n\nFine: **$${fine.toLocaleString()}**`
                })]
            });
        }

        const earned = Math.floor(Math.random() * (crime.maxWin - crime.minWin + 1)) + crime.minWin;
        updateWallet(message.author.id, earned);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Crime Successful!',
                description: `You got away with **${crime.name}**!\n\nEarned: **$${earned.toLocaleString()}**`
            })]
        });
    }
};
