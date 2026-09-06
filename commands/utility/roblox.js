const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'roblox',
        description: 'Get Roblox user info',
        usage: ',roblox [username]'
    },
    aliases: ['rbx'],
    cooldown: 10,

    async execute(message, args) {
        const username = args.join(' ');
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,roblox [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xe2231a,
                title: `Roblox — ${username}`,
                description: `[View Profile](https://www.roblox.com/users/search?keyword=${encodeURIComponent(username)})\n\n*Roblox API not connected.*`
            })]
        });
    }
};
