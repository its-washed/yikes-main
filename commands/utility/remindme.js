const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'remindme',
        description: 'Set a reminder that DMs you',
        usage: ',remindme [time] [text]'
    },
    aliases: ['rm', 'remind'],
    cooldown: 10,

    async execute(message, args) {
        const timeStr = args[0];
        const text = args.slice(1).join(' ');

        if (!timeStr || !text) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,remindme [time] [text]\nTime format: 10m, 2h, 1d')] });

        const match = timeStr.match(/^(\d+)(m|h|d|w)$/);
        if (!match) return message.reply({ embeds: [errorEmbed('Invalid Time', 'Use format like 10m, 2h, 1d, 1w.')] });

        const num = parseInt(match[1]);
        const units = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
        const ms = num * (units[match[2]] || 0);

        await message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Reminder Set',
                description: `I'll remind you in **${timeStr}**.\n\n> ${text}`
            })]
        });

        setTimeout(async () => {
            try {
                await message.author.send({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: 'Reminder',
                        description: text
                    })]
                });
            } catch {}
        }, ms);
    }
};
