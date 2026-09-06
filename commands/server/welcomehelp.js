const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'welcomehelp', description: 'Welcome message help', usage: ',welcomehelp' },
    aliases: ['whelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Welcome Help', description: 'Variables:\n`{user}` — mention user\n`{username}` — username\n`{server}` — server name\n`{count}` — member count\n`{channel}` — channel mention\n\nExample:\n`,welcome #welcome Welcome {user} to {server}! We are now {count} members.` })] });
    }
};
