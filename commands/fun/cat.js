const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'cat', description: "Get a random cat image", usage: ',cat' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        try {
            const res = await fetch('https://api.thecatapi.com/v1/images/search');
            const data = await res.json();
            return message.reply({
                embeds: [createEmbed({
                    color: 0xff819f,
                    title: 'Cat',
                    image: { url: data[0]?.url }
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Failed to retrieve cat image.')] });
        }
    }
};
