const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'queue',
        description: 'Show the music queue',
        usage: ',queue'
    },
    aliases: ['q', 'list'],
    cooldown: 5,

    async execute(message) {
        const server = servers.get(message.guild.id);
        if (!server || server.queue.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Queue', description: 'Nothing in the queue.\nUse `,play [song]` to add music.' })] });
        }

        const current = server.queue[0];
        const upcoming = server.queue.slice(1, 16);

        const desc = [
            `**Now Playing:** ${current.title}`,
            '',
            ...upcoming.map((s, i) => `**${i + 1}.** ${s.title} — ${s.requestedBy}`)
        ].join('\n');

        const more = server.queue.length > 16 ? `\n\n...and ${server.queue.length - 16} more` : '';

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Queue (${server.queue.length} song${server.queue.length !== 1 ? 's' : ''})`,
                description: desc + more
            })]
        });
    }
};
