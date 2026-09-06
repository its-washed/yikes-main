const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'timer',
        description: 'Set a timer',
        usage: ',timer [duration]'
    },
    aliases: ['countdown'],
    cooldown: 10,

    async execute(message, args) {
        const match = args[0]?.match(/^(\d+)(s|m|h|d)$/);
        if (!match) {
            return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Usage: ,timer [30s|10m|2h|1d]')] });
        }

        const amount = parseInt(match[1]);
        const unit = match[2];
        const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const ms = amount * units[unit];
        const unitNames = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days' };

        const endTime = Date.now() + ms;

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Timer Started',
                description: `Timer set for **${amount} ${unitNames[unit]}**.\nEnds: <t:${Math.floor(endTime / 1000)}:R>`
            })]
        });

        setTimeout(async () => {
            try {
                await message.reply({
                    embeds: [createEmbed({
                        color: 0x00d26a,
                        title: '⏰ Timer Ended',
                        description: `Your **${amount} ${unitNames[unit]}** timer is up!`
                    })]
                });
            } catch {}
        }, ms);
    }
};
