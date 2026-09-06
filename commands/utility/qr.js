const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'qr',
        description: 'Generate a QR code link',
        usage: ',qr [text]'
    },
    aliases: ['qrcode'],
    cooldown: 5,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,qr [text or URL]')] });

        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'QR Code',
                image: { url },
                description: `For: **${text.length > 100 ? text.slice(0, 100) + '...' : text}**`
            })]
        });
    }
};
