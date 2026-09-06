const { createEmbed } = require('../../utils/embeds');
const os = require('os');

module.exports = {
    data: {
        name: 'botinfo',
        description: 'Show bot information',
        usage: ',botinfo'
    },
    aliases: ['bi', 'about', 'botstats'],
    cooldown: 10,

    async execute(message, args, client) {
        const uptime = client.uptime;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0);

        const allCommands = client.commands.size;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: client.user.tag,
                thumbnail: { url: client.user.displayAvatarURL({ size: 1024 }) },
                description: 'Premium all-in-one Discord bot for moderation, security, and community management.',
                fields: [
                    { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                    { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
                    { name: 'Commands', value: `${allCommands}`, inline: true },
                    { name: 'Uptime', value: uptimeStr, inline: true },
                    { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
                    { name: 'Memory', value: `${memUsed}MB`, inline: true },
                    { name: 'Node.js', value: process.version, inline: true },
                    { name: 'Discord.js', value: 'v14', inline: true },
                    { name: 'Platform', value: `${os.platform()} ${os.arch()}`, inline: true },
                    { name: 'Prefix', value: '`,` (comma)', inline: true },
                    { name: 'Developer', value: '[its_washed](https://itswashed.lol)', inline: true }
                ]
            })]
        });
    }
};
