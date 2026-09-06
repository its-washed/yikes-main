const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'ping',
        description: 'Check bot latency',
        usage: ',ping'
    },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        const sent = await message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, description: 'Pinging...' })]
        });

        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const wsLatency = client.ws.ping;

        await sent.edit({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Pong!',
                fields: [
                    { name: 'Roundtrip', value: `${roundtrip}ms`, inline: true },
                    { name: 'WebSocket', value: `${wsLatency}ms`, inline: true },
                    { name: 'Status', value: wsLatency < 100 ? '🟢 Excellent' : wsLatency < 200 ? '🟡 Good' : '🔴 Poor', inline: true }
                ]
            })]
        });
    }
};
