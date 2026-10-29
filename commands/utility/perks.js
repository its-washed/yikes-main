const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'perks', description: 'Check the perks that you get for donating $3 to us / boost our server', usage: ',perks' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        return message.reply({
            embeds: [createEmbed({
                color: 0x729BB0,
                description: 'You can find all **Donator Perks** [here](https://evelina.bot/commands) when you click on `Donator` + you get 20% more daily income\n> Use `;donate` to check payment methods'
            })]
        });
    }
};
