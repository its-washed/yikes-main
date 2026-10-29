const { act } = require('../../utils/roleplay');

module.exports = {
    permission: "NSFW Channel",
    data: { name: 'cum', description: 'Cum on a member', usage: ',cum <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'cum',
            count: 'cum',
            nsfw: true,
            self: "You can't cum on yourself silly",
            text: (target, count) => `*Oh fuck!* **${message.author.username}** cum on **${target.user.username}** for the **${count}** time`
        });
    }
};
