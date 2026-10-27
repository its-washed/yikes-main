const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: {
        name: 'shutdown',
        description: 'Shut down the bot (Developer only)',
        usage: ',shutdown'
    },
    aliases: ['die'],
    cooldown: 30,

    async execute(message) {
        if (!isDeveloper(message.author.id)) {
            return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
        }

        await message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Shutting Down', description: 'Goodbye!' })] });

        process.exit(0);
    }
};
