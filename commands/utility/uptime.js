const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'uptime',
        description: 'Show bot uptime',
        usage: ',uptime'
    },
    aliases: ['ut'],
    cooldown: 5,

    async execute(message, client) {
        const uptime = client.uptime;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Uptime',
                description: `**${days}**d **${hours}**h **${minutes}**m **${seconds}**s`
            })]
        });
    }
};
