const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'remove',
        description: 'Remove a song from the queue',
        usage: ',remove [position]'
    },
    aliases: ['rm'],
    cooldown: 3,

    async execute(message, args) {
        const server = servers.get(message.guild.id);
        if (!server || server.queue.length <= 1) {
            return message.reply({ embeds: [errorEmbed('Nothing to Remove', 'Queue is empty or only has one song.')] });
        }

        const pos = parseInt(args[0]);
        if (isNaN(pos) || pos < 2 || pos > server.queue.length) {
            return message.reply({ embeds: [errorEmbed('Invalid Position', `Position must be between 2 and ${server.queue.length}.`)] });
        }

        const removed = server.queue.splice(pos - 1, 1)[0];

        return message.reply({ embeds: [successEmbed('Removed', `Removed **${removed.title}** from position ${pos}.`)] });
    }
};
