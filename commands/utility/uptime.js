const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'uptime',
        description: 'Show bot uptime',
        usage: ',uptime'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        const uptime = client.uptime;
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / 60000) % 60;
        const hours = Math.floor(uptime / 3600000) % 24;
        const days = Math.floor(uptime / 86400000);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);

        return message.reply({
            embeds: [createEmbed({
                color: 0x00d26a,
                title: 'Uptime',
                description: `I've been online for **${parts.join(' ')}**`,
                fields: [
                    { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
                    { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: 'Users', value: `${client.users.cache.size}`, inline: true }
                ]
            })]
        });
    }
};
