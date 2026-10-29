const { act } = require('../../utils/roleplay');

module.exports = {
    data: { name: 'hug', description: 'Hug a member', usage: ',hug <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'hug',
            count: 'hug',
            self: "You can't hug yourself silly",
            text: (target, count) => `*Aww how cute!* **${message.author.username}** hugged **${target.user.username}** for the **${count}** time`
        });
    }
};
