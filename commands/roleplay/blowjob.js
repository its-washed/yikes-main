const { act } = require('../../utils/roleplay');

module.exports = {
    permission: "NSFW Channel",
    data: { name: 'blowjob', description: 'Blowjob a member', usage: ',blowjob <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        return act(message, args, client, {
            action: 'blowjob',
            count: 'blowjob',
            nsfw: true,
            self: "You can't blowjob yourself silly",
            text: (target, count) => `*Oh fuck!* **${message.author.username}** gave **${target.user.username}** a blowjob for the **${count}** time`
        });
    }
};
