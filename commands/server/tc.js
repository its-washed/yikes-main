module.exports = {
    permission: "ticket support / manage channels",
    data: { name: 'tc', description: 'Close the current ticket', usage: ',tc' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        const ticket = require('./ticket');
        return ticket.subs.close.execute(message, args, client, config);
    }
};
