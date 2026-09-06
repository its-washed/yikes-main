const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'shutdown',
        description: 'Shut down the bot',
        usage: ',shutdown'
    },
    aliases: ['restart', 'die'],
    cooldown: 30,

    async execute(message) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator permission.')] });
        }

        await message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Shutting Down', description: 'Goodbye!' })] });

        process.exit(0);
    }
};
