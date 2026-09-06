const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'ping',
        description: 'Check bot latency',
        usage: ',ping'
    },
    aliases: ['latency'],
    cooldown: 5,

    async execute(message, client) {
        const sent = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Pinging...' })] });

        const roundtrip = sent.createdTimestamp - message.createdTimestamp;

        return sent.edit({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Pong!',
                fields: [
                    { name: 'Roundtrip', value: `${roundtrip}ms`, inline: true },
                    { name: 'API', value: `${client.ws.ping}ms`, inline: true }
                ]
            })]
        });
    }
};
