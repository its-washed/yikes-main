const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'youngest', description: 'Get the youngest account in the server', usage: ',youngest' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const members = [...message.guild.members.cache.values()]
            .filter((m) => !m.user.bot)
            .sort((a, b) => b.user.createdTimestamp - a.user.createdTimestamp);
        const member = members[0];
        if (!member) return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: 'No members found' }] });
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: `Youngest account in ${message.guild.name}`,
                url: `https://discord.com/users/${member.id}`,
                fields: [
                    { name: 'user', value: `${member}` },
                    { name: 'created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` }
                ]
            }]
        });
    }
};
