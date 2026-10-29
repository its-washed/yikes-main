const { act } = require('../../utils/roleplay');

module.exports = {
    data: { name: 'cuddle', description: 'Cuddle a member', usage: ',cuddle <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'cuddle',
            count: 'cuddle',
            self: "You can't cuddle yourself silly",
            text: (target, count) => `*Aww how cute!* **${message.author.username}** cuddles **${target.user.username}** for the **${count}** time`
        });
    }
};
