const { createEmbed, errorEmbed } = require('../../utils/embeds');
const crypto = require('crypto');

module.exports = {
    data: { name: 'password', description: 'Generate a random password', usage: ',password [length]' },
    aliases: ['genpass', 'pass'],
    cooldown: 3,
    async execute(message, args) {
        const len = Math.min(Math.max(parseInt(args[0]) || 16, 4), 100);
        const pass = crypto.randomBytes(len).toString('base64url').slice(0, len);
        return message.reply({
            embeds: [createEmbed({ color: 0x22c55e, title: 'Generated Password', description: `\`${pass}\`` })],
            ephemeral: true
        });
    }
};
