const TARGETS = [
    'north korea',
    'no one',
    'ion even know wat to put here',
    '6ix9ines ankle monitor',
    'the chinese government',
    'horny asian women around your area',
    'the migos minecraft server',
    'your mom',
    "charlie's mud hut",
    '267 tries to wake trave up from hibernation',
    'that new evelina.bot domain',
    'a connection to the server',
    "franzi's lovense",
    "kjell's skyblock cheats",
    "kinex's downfall"
];

module.exports = {
    data: { name: 'ping', description: 'Displays the bot\'s latency', usage: ',ping' },
    cooldown: 5,

    async execute(message, args, client) {
        const sentenceRandom = TARGETS[Math.floor(Math.random() * TARGETS.length)];
        const latency = Math.round(client.ws.ping);
        const start = Date.now();
        const sent = await message.reply(`it took \`${latency}ms\` to ping **${sentenceRandom}**`);
        const execution = Math.round((Date.now() - start) * 10) / 10;
        return sent.edit(`it took \`${latency}ms\` to ping **${sentenceRandom}** (edit: \`${execution}ms\`)`);
    }
};
