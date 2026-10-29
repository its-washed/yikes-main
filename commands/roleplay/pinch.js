const { act } = require('../../utils/roleplay');

module.exports = {
    data: { name: 'pinch', description: 'Pinch a member', usage: ',pinch <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'pinch',
            count: 'pinch',
            self: "You can't pinch yourself silly",
            text: (target, count) => `**${message.author.username}** pinches **${target.user.username}** for the **${count}** time`
        });
    }
};
