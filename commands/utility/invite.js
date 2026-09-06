const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'invite',
        description: 'Get bot invite link',
        usage: ',invite'
    },
    aliases: ['botinvite'],
    cooldown: 5,

    async execute(message, client) {
        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Invite Me',
                description: `[Click here to invite me](${invite})`
            })]
        });
    }
};
