const emoji = require('./emoji');

module.exports = {
    permission: "manage expressions",
    data: { name: 'steal', description: 'Steal an emoji from another server', usage: ',steal 🦮 mommy', params: ['emoji', '[name]'] },
    aliases: ['add'],
    cooldown: 3,
    async execute(message, args, client, config) {
        return emoji.subs.steal.execute(message, args, client, config);
    }
};
