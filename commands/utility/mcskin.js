const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'mcskin', description: 'Get Minecraft skin', usage: ',mcskin [username]' },
    aliases: ['skin'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,mcskin [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Minecraft Skin — ${user}`, image: { url: `https://mc-heads.net/body/${user}/300` }, description: `[View](https://namemc.com/profile/${user})` })] });
    }
};
