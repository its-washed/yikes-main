const { act } = require('../../utils/roleplay');

module.exports = {
    data: { name: 'kiss', description: 'Kiss a member', usage: ',kiss <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'kiss',
            count: 'kiss',
            self: "You can't kiss yourself silly",
            text: (target, count) => `*Aww how cute!* **${message.author.username}** kissed **${target.user.username}** for the **${count}** time`
        });
    }
};
