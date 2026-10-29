module.exports = {
    permission: "ticket support / manage channels",
    data: { name: 'trn', description: "Close the current ticket", usage: ',trn nitro', params: ['name'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        const ticket = require('./ticket');
        return ticket.subs.rename.execute(message, args, client, config);
    }
};
