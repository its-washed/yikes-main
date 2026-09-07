const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'frog', description: 'Random frog picture', usage: ',frog' },
    aliases: ['frogs'],
    cooldown: 3,
    async execute(message) {
        try {
            const res = await fetch('https://randomfrogs.net/api/v1/random');
            const data = await res.json();
            return message.reply({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: 'Frog',
                    image: { url: data.url || data.image || 'https://i.imgur.com/8nL0v9M.jpg' }
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch frog.')] });
        }
    }
};
