const { resolveMember } = require('../../utils/roleplay');
const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'stfu', description: 'Tell a member to shut up', usage: ',stfu <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        const target = await resolveMember(message, args[0]);
        if (!target) {
            return warn(message, `Member **${args[0] || ''}** couldn't be found`);
        }
        if (target.id === message.author.id) {
            return warn(message, "Why do you wan't to tell yourself to shut up");
        }
        return message.reply(`${target} shut the fuck up! 🙄`);
    }
};
