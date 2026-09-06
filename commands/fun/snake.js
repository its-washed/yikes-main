const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'snake', description: 'Play snake game', usage: ',snake' },
    aliases: [],
    cooldown: 30,
    async execute(message) {
        const size = 5;
        const snake = [{ x: 2, y: 2 }];
        const food = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
        let dir = { x: 0, y: 1 };

        const render = () => {
            const grid = Array.from({ length: size }, () => Array(size).fill('⬜'));
            snake.forEach(s => { if (s.x >= 0 && s.x < size && s.y >= 0 && s.y < size) grid[s.y][s.x] = '🟩'; });
            if (food.y >= 0 && food.y < size && food.x >= 0 && food.x < size) grid[food.y][food.x] = '🍎';
            return grid.map(r => r.join('')).join('\n');
        };

        const msg = await message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Snake', description: render() + '\n\n⬆️⬇️⬅️➡️ to move' })] });
        for (const e of ['⬆️', '⬇️', '⬅️', '➡️']) await msg.react(e);

        const filter = (r, u) => u.id === message.author.id && ['⬆️', '⬇️', '⬅️', '➡️'].includes(r.emoji.name);
        const collector = msg.createReactionCollector({ filter, time: 60000 });

        collector.on('collect', async (reaction) => {
            const dirs = { '⬆️': { x: 0, y: -1 }, '⬇️': { x: 0, y: 1 }, '⬅️': { x: -1, y: 0 }, '➡️': { x: 1, y: 0 } };
            dir = dirs[reaction.emoji.name];

            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

            if (head.x < 0 || head.x >= size || head.y < 0 || head.y >= size || snake.some(s => s.x === head.x && s.y === head.y)) {
                await msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Game Over!', description: `Score: **${snake.length - 1}**\n\n${render()}` })] });
                await msg.reactions.removeAll();
                collector.stop();
                return;
            }

            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) {
                food.x = Math.floor(Math.random() * size);
                food.y = Math.floor(Math.random() * size);
            } else {
                snake.pop();
            }

            await msg.edit({ embeds: [createEmbed({ color: 0x22c55e, title: 'Snake', description: render() + `\n\nScore: **${snake.length - 1}**` })] });
            await reaction.users.remove(message.author.id);
        });
    }
};
