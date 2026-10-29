const { act } = require('../../utils/roleplay');

module.exports = {
    permission: "NSFW Channel",
    data: { name: 'fuck', description: 'Fuck a member', usage: ',fuck its_washed', params: ['member'] },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'fuck',
            count: 'fucked',
            nsfw: true,
            self: "You can't fuck yourself silly",
            text: (target, count) => `*Oh fuck!* **${message.author.username}** fucked **${target.user.username}** for the **${count}** time`
        });
    }
};
