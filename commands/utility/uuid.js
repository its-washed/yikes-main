const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    data: { name: 'uuid', description: 'Generate UUIDs', usage: ',uuid [amount]' },
    cooldown: 3,
    async execute(message, args) {
        const count = Math.min(parseInt(args[0]) || 1, 10);
        const uuids = Array.from({ length: count }, () => uuidv4());
        return message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'UUIDs', description: uuids.map(u => `\`${u}\``).join('\n') })]
        });
    }
};
