const giveaway = require('./giveaway');

module.exports = {
    permission: "manage_server",
    data: { name: 'gend', description: 'End an active giveaway early', usage: ',gend <message>' },
    aliases: [],
    cooldown: 5,
    execute: async (message, args, client) => giveaway.subs.end.execute(message, args, client)
};
