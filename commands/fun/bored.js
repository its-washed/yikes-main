const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'bored', description: 'Get a random activity', usage: ',bored' },
    aliases: ['activity'],
    cooldown: 5,
    async execute(message) {
        try {
            const res = await fetch('https://www.boredapi.com/api/activity');
            const data = await res.json();
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Bored?',
                    description: data.activity,
                    fields: [
                        { name: 'Type', value: data.type || 'Any', inline: true },
                        { name: 'Participants', value: `${data.participants || 1}`, inline: true }
                    ]
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch activity.')] });
        }
    }
};
