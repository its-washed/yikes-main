const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'setname', description: 'Set bot username (Developer only)', usage: ',setname <username>' },
    aliases: ['username', 'name'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const name = args.join(' ');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,setname <username>')] });

        try {
            await client.user.setUsername(name);
            return message.reply({ embeds: [successEmbed('Name Updated', `Bot username set to **${name}**.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
