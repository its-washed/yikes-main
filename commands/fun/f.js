const { createEmbed } = require('../../utils/embeds');

const respectMessages = [
    "F",
    "Pressing F to pay respects...",
    "We pay our respects. F.",
    "Respects have been paid. F.",
    "F in the chat.",
    "Everyone pays their respects. F."
];

module.exports = {
    data: {
        name: 'f',
        description: 'Pay respects',
        usage: ',f [reason]'
    },
    aliases: ['payrespects', 'pressf'],
    cooldown: 5,

    async execute(message, args) {
        const reason = args.join(' ') || 'something';
        const msg = respectMessages[Math.floor(Math.random() * respectMessages.length)];

        return message.reply({
            embeds: [createEmbed({ color: 0x2f3542, description: `**F** — ${msg}\nPaying respects for **${reason}**` })]
        });
    }
};
