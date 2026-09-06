const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'character',
        description: 'Get a random anime/cartoon character',
        usage: ',character'
    },
    aliases: ['randchar', 'animechar'],
    cooldown: 5,

    async execute(message) {
        const characters = [
            { name: 'Naruto Uzumaki', series: 'Naruto' },
            { name: 'Goku', series: 'Dragon Ball' },
            { name: 'Luffy', series: 'One Piece' },
            { name: 'Edward Elric', series: 'Fullmetal Alchemist' },
            { name: 'Saitama', series: 'One Punch Man' },
            { name: 'Levi Ackerman', series: 'Attack on Titan' },
            { name: 'Gojo Satoru', series: 'Jujutsu Kaisen' },
            { name: 'Tanjiro Kamado', series: 'Demon Slayer' },
            { name: 'Deku', series: 'My Hero Academia' },
            { name: 'Spike Spiegel', series: 'Cowboy Bebop' },
            { name: 'Guts', series: 'Berserk' },
            { name: 'Alucard', series: 'Hellsing' },
            { name: 'Light Yagami', series: 'Death Note' },
            { name: 'L Lawliet', series: 'Death Note' },
            { name: 'Eren Yeager', series: 'Attack on Titan' }
        ];

        const char = characters[Math.floor(Math.random() * characters.length)];

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: char.name,
                description: `From: **${char.series}**`
            })]
        });
    }
};
