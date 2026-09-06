const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'shutdown',
        description: 'Shut down the bot',
        usage: ',shutdown'
    },
    aliases: ['restart', 'die'],
    cooldown: 30,

    async execute(message) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator permission.')] });
        }

        await message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Shutting Down', description: 'Goodbye!' })] });

        process.exit(0);
    }
};
