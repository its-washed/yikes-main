const { createEmbed, errorEmbed } = require('../../utils/embeds');
const os = require('os');

module.exports = {
    data: {
        name: 'stats',
        description: 'Show bot statistics',
        usage: ',stats'
    },
    aliases: ['botstats'],
    cooldown: 10,

    async execute(message, client) {
        const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Bot Statistics',
                fields: [
                    { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                    { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
                    { name: 'Commands', value: `${client.commands.size}`, inline: true },
                    { name: 'Memory', value: `${memUsed}MB`, inline: true },
                    { name: 'Node.js', value: process.version, inline: true },
                    { name: 'Platform', value: `${os.platform()} ${os.arch()}`, inline: true },
                    { name: 'Discord.js', value: 'v14', inline: true }
                ]
            })]
        });
    }
};
