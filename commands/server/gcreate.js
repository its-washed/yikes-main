const giveaway = require('./giveaway');

module.exports = {
    permission: "manage guild",
    data: { name: 'gcreate', description: 'Start a giveaway with your provided duration, winners and prize description', usage: ',gcreate <channel> <time> <winners> <prize>' },
    aliases: [],
    cooldown: 5,
    execute: async (message, args, client) => giveaway.subs.create.execute(message, args, client)
};
