const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

const jobs = [
    { name: 'Pizza Delivery', min: 50, max: 200 },
    { name: 'Dog Walker', min: 30, max: 150 },
    { name: 'Freelance Coder', min: 100, max: 500 },
    { name: 'Bartender', min: 40, max: 180 },
    { name: 'Taxi Driver', min: 60, max: 250 },
    { name: 'Construction Worker', min: 80, max: 300 },
    { name: 'Streamer', min: 10, max: 1000 },
    { name: 'Graphic Designer', min: 70, max: 350 },
    { name: 'Chef', min: 50, max: 220 },
    { name: 'Gardener', min: 30, max: 130 },
];

module.exports = {
    data: { name: 'work', description: 'Work to earn money', usage: ',work' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 30 * 60 * 1000;

        if (now - user.lastWork < cooldown) {
            const remaining = cooldown - (now - user.lastWork);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            return message.reply({ embeds: [errorEmbed('Cooldown', `You can work again in **${minutes}m ${seconds}s**.`)] });
        }

        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
        updateWallet(message.author.id, earned);

        const data = require('../../utils/economy').loadEconomy();
        data.users[message.author.id].lastWork = now;
        require('../../utils/economy').saveEconomy(data);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Work',
                description: `You worked as a **${job.name}** and earned **$${earned.toLocaleString()}**!`
            })]
        });
    }
};
