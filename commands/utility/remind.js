const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { readJSON, writeJSON } = require('../../utils/database');
const { v4: uuid } = require('uuid');

module.exports = {
    data: { name: 'remind', description: 'Set a reminder', usage: ',remind <time> <message>\nTime: 10s, 5m, 2h, 1d' },
    aliases: ['remindme', 'reminder'],
    cooldown: 5,
    async execute(message, args) {
        if (!args[0]) return message.reply({ embeds: [errorEmbed('Usage', ',remind <time> <message>\nExamples: 10s, 5m, 2h, 1d')] });

        const time = args[0].toLowerCase();
        const match = time.match(/^(\d+)(s|m|h|d)$/);
        if (!match) return message.reply({ embeds: [errorEmbed('Invalid Time', 'Use s/m/h/d (e.g., 10s, 5m, 2h, 1d)')] });

        const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
        const duration = parseInt(match[1]) * ms;
        const text = args.slice(1).join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('No Message', 'Provide a reminder message.')] });

        const reminders = readJSON('reminders.json') || [];
        reminders.push({
            id: uuid(),
            userId: message.author.id,
            channelId: message.channel.id,
            guildId: message.guild.id,
            text,
            expires: Date.now() + duration
        });
        writeJSON('reminders.json', reminders);

        return message.reply({ embeds: [successEmbed('Reminder Set', `I'll remind you in **${args[0]}**.`)] });
    }
};
