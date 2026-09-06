const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'say',
        description: 'Make the bot say something',
        usage: ',say [text]'
    },
    aliases: ['echo', 'repeat'],
    cooldown: 3,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages permission.')] });
        }

        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,say [text]')] });

        return message.reply({ content: text });
    }
};
