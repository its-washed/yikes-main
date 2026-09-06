const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'robloxprofile', description: 'Get Roblox profile', usage: ',robloxprofile [username]' },
    aliases: ['rbxprofile'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,robloxprofile [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xe2231a, title: `Roblox — ${user}`, description: `[View Profile](https://www.roblox.com/users/search?keyword=${encodeURIComponent(user)})\n\n*API not connected.*` })] });
    }
};
