const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'membercount', description: 'Show member count', usage: ',membercount' },
    aliases: ['mc', 'members'],
    cooldown: 5,
    async execute(message) {
        const g = message.guild;
        const bots = g.members.cache.filter(m => m.user.bot).size;
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7, title: 'Member Count',
                fields: [
                    { name: 'Total', value: `${g.memberCount}`, inline: true },
                    { name: 'Humans', value: `${g.memberCount - bots}`, inline: true },
                    { name: 'Bots', value: `${bots}`, inline: true }
                ]
            })]
        });
    }
};
