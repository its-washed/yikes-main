const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'invite',
        description: 'Get bot invite link',
        usage: ',invite'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Invite Yikes',
                description: `[Click here to invite me to your server](${invite})`,
                fields: [
                    { name: 'Permissions', value: 'Administrator (full access)', inline: true }
                ]
            })]
        });
    }
};
