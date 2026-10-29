const { act } = require('../../utils/roleplay');

const OPENERS = ['You slurp that mf.', 'Lick Lick!', 'Slurp!'];

module.exports = {
    data: { name: 'lick', description: 'Lick a member', usage: ',lick <member>' },
    aliases: ['slurp'],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'lick',
            count: 'lick',
            self: "You can't lick yourself silly",
            text: (target, count) => `*${OPENERS[Math.floor(Math.random() * OPENERS.length)]}* **${message.author.username}** licked **${target.user.username}** for the **${count}** time`
        });
    }
};
