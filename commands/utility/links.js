const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'links', description: 'Get all bot links', usage: ',links' },
    aliases: ['botlinks'],
    cooldown: 5,
    async execute(message, client) {
        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7, title: 'Bot Links',
                fields: [
                    { name: 'Invite', value: `[Click here](${invite})`, inline: true },
                    { name: 'Support', value: '[Join Server](https://discord.gg/yikes)', inline: true },
                    { name: 'Website', value: '[itswashed.lol](https://itswashed.lol)', inline: true }
                ]
            })]
        });
    }
};
