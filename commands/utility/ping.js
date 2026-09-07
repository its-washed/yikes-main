const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ping', description: 'Show bot latency', usage: ',ping' },
    cooldown: 2,
    async execute(message, client) {
        const sent = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Pinging...' })] });

        const apiLatency = sent.createdTimestamp - message.createdTimestamp;
        const wsLatency = client.ws.ping;

        return sent.edit({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Pong!',
                fields: [
                    { name: 'API', value: `**${apiLatency}ms**`, inline: true },
                    { name: 'WebSocket', value: `**${wsLatency}ms**`, inline: true }
                ]
            })]
        });
    }
};
