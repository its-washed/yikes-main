const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'race',
        description: 'Race a random animal',
        usage: ',race [animal]'
    },
    aliases: ['animalrace'],
    cooldown: 10,

    async execute(message, args) {
        const animals = ['🐢', '🐇', '🐕', '🐈', '🦅', '🐎', '🦁', '🐘', '🦈', '🐬'];
        const animal = args[0] || animals[Math.floor(Math.random() * animals.length)];

        const lanes = 10;
        let progress = {};
        animals.forEach(a => progress[a] = 0);

        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Race!', description: getRaceBar(progress, lanes) })] });

        const winner = animals[Math.floor(Math.random() * animals.length)];

        for (let i = 0; i < 30; i++) {
            animals.forEach(a => {
                if (progress[a] < lanes) {
                    progress[a] += Math.random() > 0.4 ? 1 : 0;
                }
            });

            if (progress[winner] >= lanes) break;

            await msg.edit({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Race!', description: getRaceBar(progress, lanes) })] });
            await new Promise(r => setTimeout(r, 500));
        }

        progress[winner] = lanes;
        await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'Race Over!', description: `**${winner}** wins!\n\n${getRaceBar(progress, lanes)}` })] });
    }
};

function getRaceBar(progress, lanes) {
    return Object.entries(progress).map(([animal, pos]) => {
        const bar = '═'.repeat(pos) + '🏁' + '═'.repeat(Math.max(lanes - pos - 1, 0));
        return `${animal} ${bar}`;
    }).join('\n');
}
