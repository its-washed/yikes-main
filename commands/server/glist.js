const giveaway = require('./giveaway');

module.exports = {
    data: { name: 'glist', description: 'List every active giveaway in the server', usage: ',glist' },
    aliases: [],
    cooldown: 5,
    execute: async (message, args, client) => giveaway.subs.list.execute(message, args, client)
};
