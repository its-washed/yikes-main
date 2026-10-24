module.exports = {
    data: { name: 'ping', description: 'Show bot latency', usage: ',ping' },
    cooldown: 2,
    async execute(message, args, client) {
        const wsLatency = client.ws.ping;
        return message.reply(`it took **${wsLatency}ms** to reach washeds peepee`);
    }
};
