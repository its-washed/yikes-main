const { act } = require('../../utils/roleplay');

module.exports = {
    permission: "NSFW Channel",
    data: { name: 'pussylick', description: 'Pussylick a member', usage: ',pussylick <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'pussylick',
            count: 'pussylick',
            nsfw: true,
            self: "You can't pussylick yourself silly",
            text: (target, count) => `*Oh fuck!* **${message.author.username}** pussylicked **${target.user.username}** for the **${count}** time`
        });
    }
};
