const { act } = require('../../utils/roleplay');

module.exports = {
    data: { name: 'slap', description: 'Slap a member', usage: ',slap <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'slap',
            count: 'slap',
            self: "You can't slap yourself silly",
            text: (target, count) => `**${message.author.username}** slaps **${target.user.username}** for the **${count}** time`
        });
    }
};
