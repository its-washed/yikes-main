const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'binarygame',
        description: 'Guess the binary number',
        usage: ',binarygame'
    },
    aliases: ['bg'],
    cooldown: 10,

    async execute(message) {
        const num = Math.floor(Math.random() * 256);
        const binary = num.toString(2).padStart(8, '0');
        const options = [num];
        while (options.length < 4) {
            const rand = Math.floor(Math.random() * 256);
            if (!options.includes(rand)) options.push(rand);
        }
        options.sort(() => Math.random() - 0.5);

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        const optStr = options.map((o, i) => `${emojis[i]} **${o}**`).join('\n');

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Binary Game',
                description: `What decimal is this?\n\`\`\`${binary}\`\`\`\n\n${optStr}`
            })]
        });

        for (let i = 0; i < options.length; i++) await msg.react(emojis[i]);

        const filter = (r, u) => u.id === message.author.id;
        const collector = msg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (reaction) => {
            const idx = emojis.indexOf(reaction.emoji.name);
            const chosen = options[idx];
            const correct = chosen === num;

            await msg.edit({
                embeds: [createEmbed({
                    color: correct ? 0x00d26a : 0xff4757,
                    title: correct ? 'Correct!' : 'Wrong!',
                    description: `\`${binary}\` = **${num}**\nYour answer: **${chosen}**`
                })]
            });
            await msg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                msg.edit({ embeds: [createEmbed({ color: 0xffa502, title: 'Time\'s Up!', description: `\`${binary}\` = **${num}**` })] });
                msg.reactions.removeAll();
            }
        });
    }
};
