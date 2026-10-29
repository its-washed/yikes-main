const { act } = require('../../utils/roleplay');

module.exports = {
    data: { name: 'pat', description: 'Pat a member', usage: ',pat <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'pat',
            count: 'pat',
            self: "You can't pat yourself silly",
            text: (target, count) => `*Aww how cute!* **${message.author.username}** pats **${target.user.username}** for the **${count}** time`
        });
    }
};
