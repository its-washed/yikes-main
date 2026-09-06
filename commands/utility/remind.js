const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'remind',
        description: 'Set a reminder',
        usage: ',remind [time] [message]'
    },
    aliases: ['reminder'],
    cooldown: 10,

    async execute(message, args) {
        if (args.length < 2) {
            return message.reply({
                embeds: [errorEmbed('Missing Arguments', 'Usage: ,remind [time] [message]\nTime formats: 10m, 2h, 1d')]
            });
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
            embeds: [successEmbed('Reminder Set', `I'll remind you in **${amount} ${unitNames[unit]}**.\n\n> ${reminderText}`)]
        });

        setTimeout(async () => {
            try {
                await message.author.send({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: 'Reminder',
                        description: reminderText,
                        fields: [{ name: 'From', value: `${message.guild.name} in ${message.channel}`, inline: true }]
                    })]
                });
            } catch {
                message.channel.send({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: 'Reminder',
                        description: `${message.author}, here's your reminder:\n\n> ${reminderText}`
                    })]
                }).catch(() => {});
            }
        }, ms);
    }
};
