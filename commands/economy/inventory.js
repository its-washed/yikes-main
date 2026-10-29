const { warn } = require('../../utils/context');
const { first } = require('../../utils/database');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'inventory', description: 'View your inventory or from a given user', usage: ',inventory [user]' },
    aliases: ["inv"],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const user_data = first('SELECT * FROM economy WHERE user_id = ?', target.id);
        if (!user_data) return message.reply('Error: User data not found.');

        const n = value => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                author: {
                    name: `${target.username}'s Inventory`,
                    icon_url: target.displayAvatarURL()
                },
                fields: [
                    { name: 'Bank Space', value: n(user_data.item_bank), inline: true },
                    { name: 'Cases', value: n(user_data.item_case), inline: true },
                    { name: 'Blackice Cases', value: n(user_data.item_case_blackice), inline: true }
                ]
            }]
        });
    }
};
