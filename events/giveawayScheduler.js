const { Events } = require('discord.js');
const { query } = require('../utils/database');
const giveaway = require('../commands/server/giveaway');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const tick = async () => {
            try {
                const due = query('SELECT * FROM giveaway WHERE finish <= ?', new Date().toISOString());
                for (const row of due) {
                    await giveaway.endGiveaway(client, row).catch(() => {});
                }
            } catch (err) {}
        };
        setTimeout(tick, 5000);
        setInterval(tick, 30000);
    }
};
