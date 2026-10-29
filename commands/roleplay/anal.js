const { act } = require('../../utils/roleplay');

module.exports = {
    permission: "NSFW Channel",
    data: { name: 'anal', description: 'Fuck a member anal', usage: ',fuck its_washed', params: ['member'] },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'anal',
            count: 'anal',
            nsfw: true,
            self: "You can't fuck yourself anal silly",
            text: (target, count) => `*Oh fuck!* **${message.author.username}** fucked **${target.user.username}** anal for the **${count}** time`
        });
    }
};
