const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'uptime', description: 'Show bot uptime', usage: ',uptime' },
    aliases: ['up'],
    cooldown: 3,
    async execute(message, client) {
        const ms = client.uptime;
        const days = Math.floor(ms / 86400000);
        const hours = Math.floor((ms % 86400000) / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Uptime',
                description: `**${days}d ${hours}h ${mins}m ${secs}s**`
            })]
        });
    }
};
