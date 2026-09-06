const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'connect4', description: 'Play Connect Four', usage: ',connect4 [@user]' },
    aliases: ['c4'],
    cooldown: 30,
    async execute(message) {
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply({ embeds: [errorEmbed('Missing Opponent', 'Usage: ,connect4 [@user]')] });
        if (opponent.id === message.author.id || opponent.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'Pick a real opponent.')] });

        const rows = 6, cols = 7;
        const grid = Array.from({ length: rows }, () => Array(cols).fill('⬛'));
        let current = '🔴';

        const render = () => '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n' + grid.map(r => r.join('')).join('\n');

        const msg = await message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Connect Four', description: `${message.author.tag} (🔴) vs ${opponent.tag} (🟡)\n\n${render()}\n\n${current === '🔴' ? message.author : opponent}'s turn.` })]
        });

        for (let i = 1; i <= 7; i++) await msg.react(['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'][i-1]);

        const filter = (r, u) => (u.id === message.author.id || u.id === opponent.id) && ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'].includes(r.emoji.name);
        const collector = msg.createReactionCollector({ filter, time: 120000 });

        collector.on('collect', async (reaction, user) => {
            const col = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣'].indexOf(reaction.emoji.name);
            if ((current === '🔴' && user.id !== message.author.id) || (current === '🟡' && user.id !== opponent.id)) return;

            let placed = -1;
            for (let r = rows - 1; r >= 0; r--) {
                if (grid[r][col] === '⬛') { grid[r][col] = current; placed = r; break; }
            }
            if (placed === -1) return;

            const winner = checkC4(grid, placed, col);
            if (winner) {
                const w = winner === '🔴' ? message.author : opponent;
                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'Game Over!', description: `${w.tag} wins!\n\n${render()}` })] });
                await msg.reactions.removeAll();
                collector.stop();
                return;
            }

            if (grid[0].every(c => c !== '⬛')) {
                await msg.edit({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Draw!', description: render() })] });
                await msg.reactions.removeAll();
                collector.stop();
                return;
            }

            current = current === '🔴' ? '🟡' : '🔴';
            await msg.edit({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Connect Four', description: `${message.author.tag} (🔴) vs ${opponent.tag} (🟡)\n\n${render()}\n\n${current === '🔴' ? message.author : opponent}'s turn.` })] });
            await reaction.users.remove(user.id);
        });
    }
};

function checkC4(grid, row, col) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    const color = grid[row][col];
    for (const [dr,dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            const r = row + dr*i, c = col + dc*i;
            if (r >= 0 && r < 6 && c >= 0 && c < 7 && grid[r][c] === color) count++;
            else break;
        }
        for (let i = 1; i < 4; i++) {
            const r = row - dr*i, c = col - dc*i;
            if (r >= 0 && r < 6 && c >= 0 && c < 7 && grid[r][c] === color) count++;
            else break;
        }
        if (count >= 4) return color;
    }
    return null;
}
