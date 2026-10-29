const { warn } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { eventGroup } = require('../../utils/eventMessages');

module.exports = {
    data: { name: 'leave', description: 'Set up a goodbye message in one or multiple channels', usage: ',leave <add|remove|list|test|reset>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'test', 'reset'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, remove, list, test, reset');
        return sendCard(message, module.exports);
    },
    subs: eventGroup('leave', 'leave')
};
