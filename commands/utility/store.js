const { prefix } = require('../../utils/moderation');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'store', description: 'View evelina online shop', usage: ',store' },
    aliases: ['donation', 'donator', 'donate', 'buy', 'prices', 'pricing'],
    cooldown: 5,
    async execute(message) {
        const embed = {
            color: COLORS.NEUTRAL,
            url: 'https://evelina.bot/premium',
            title: 'Evelina - Shop',
            description: `After you paid, run \`${prefix(message)}claim\` and enter your key to gain your **product**.\n> If you need help, create a Ticket in our [**Support Server**](https://discord.gg/evelina)`,
            footer: {
                text: 'All payments go directly to the bot for hosting, API expenses and more',
                icon_url: 'https://cdn.discordapp.com/emojis/1049028656128864286.png'
            }
        };

        const row = {
            type: 1,
            components: [
                { type: 2, style: 8, sku_id: '1341790105253318758', row: 0 },
                { type: 2, style: 3, sku_id: '1341772208753737850', row: 0 },
                { type: 2, style: 1, sku_id: '1341773061136977971', row: 0 }
            ]
        };
        const row2 = {
            type: 1,
            components: [
                { type: 2, style: 4, sku_id: '1341766457939460117' },
                { type: 2, style: 2, sku_id: '1341770489709723658' },
                { type: 2, style: 2, sku_id: '1341773925717250089' }
            ]
        };

        return message.reply({ embeds: [embed], components: [row, row2] });
    }
};
