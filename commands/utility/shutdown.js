const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
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
            return message.reply({ embeds: [permissionDenied(message, 'administrator')] });
        }

        await message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Shutting Down', description: 'Goodbye!' })] });

        process.exit(0);
    }
};
