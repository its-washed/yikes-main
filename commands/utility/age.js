const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'age',
        description: 'Calculate age from birthdate',
        usage: ',age [YYYY-MM-DD]'
    },
    aliases: ['calculateage'],
    cooldown: 3,

    async execute(message, args) {
        const dateStr = args[0];
        if (!dateStr) return message.reply({ embeds: [errorEmbed('Missing Date', 'Usage: ,age [YYYY-MM-DD]')] });

        const parts = dateStr.split('-');
        if (parts.length !== 3) return message.reply({ embeds: [errorEmbed('Invalid Format', 'Use YYYY-MM-DD format.')] });

        const birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(birth.getTime())) return message.reply({ embeds: [errorEmbed('Invalid Date', 'That date doesn\'t exist.')] });

        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;

        const daysUntilBirthday = getDaysUntilBirthday(birth);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Age Calculator',
                fields: [
                    { name: 'Birthdate', value: `<t:${Math.floor(birth.getTime() / 1000)}:D>`, inline: true },
                    { name: 'Age', value: `${age} years`, inline: true },
                    { name: 'Next Birthday', value: `${daysUntilBirthday} day(s)`, inline: true }
                ]
            })]
        });
    }
};

function getDaysUntilBirthday(birth) {
    const today = new Date();
    const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (next < today) next.setFullYear(next.getFullYear());
    return Math.ceil((next - today) / 86400000);
}
