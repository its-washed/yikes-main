const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'remindme',
        description: 'Set a reminder (DM)',
        usage: ',remindme [time] [message]'
    },
    aliases: ['rm'],
    cooldown: 10,

    async execute(message, args) {
        if (args.length < 2) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,remindme [time] [message]\nTime formats: 10m, 2h, 1d')] });
        }

        const timeStr = args[0];
        const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
        if (!match) {
            return message.reply({ embeds: [errorEmbed('Invalid Time', 'Use formats like: 10m, 2h, 1d')] });
        }

        const amount = parseInt(match[1]);
        const unit = match[2];
        const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const ms = amount * units[unit];
        const reminderText = args.slice(1).join(' ');
        const unitNames = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days' };

        await message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reminder Set', description: `I'll DM you in **${amount} ${unitNames[unit]}**.\n\n> ${reminderText}` })]
        });

        setTimeout(async () => {
            try {
                await message.author.send({
                    embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reminder', description: reminderText })]
                });
            } catch {}
        }, ms);
    }
};
