const giveaway = require('./giveaway');

module.exports = {
    permission: "manage guild",
    data: { name: 'greroll', description: 'Reroll a winner for the specified giveaway', usage: ',greroll <message> [winners]' },
    aliases: [],
    cooldown: 5,
    execute: async (message, args, client) => giveaway.subs.reroll.execute(message, args, client)
};
