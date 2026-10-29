const { warn } = require('../../utils/context');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'networth', description: "Check your networth", usage: ',networth its_washed', params: ['[user]'] },
    aliases: ['nw'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;
        const target = (message.mentions && message.mentions.users && message.mentions.users.first()) || message.author;
        const networth = E.getUserNetworth(target.id);
        return message.reply({
            embeds: [{
                color: 0x729bb0,
                description: `${target} has a networth of **${E.humanize(networth)}** \ud83d\udcb5`
            }]
        });
    }
};
