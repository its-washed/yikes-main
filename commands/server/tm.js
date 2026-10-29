module.exports = {
    permission: "ticket support / manage channels",
    data: { name: 'tm', description: 'Move the ticket to another category', usage: ',tm paid', params: ['category'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        const ticket = require('./ticket');
        return ticket.subs.move.execute(message, args, client, config);
    }
};
