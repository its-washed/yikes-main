const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'minesweeper', description: 'Play minesweeper', usage: ',minesweeper [difficulty]' },
    aliases: ['mine'],
    cooldown: 15,
    async execute(message, args) {
        const diff = (args[0] || 'easy').toLowerCase();
        const sizes = { easy: 5, medium: 7, hard: 9 };
        const mines = { easy: 5, medium: 10, hard: 20 };
        const size = sizes[diff] || 5;
        const mineCount = mines[diff] || 5;

        const grid = Array.from({ length: size }, () => Array(size).fill(0));
        let placed = 0;
        while (placed < mineCount) {
            const r = Math.floor(Math.random() * size);
            const c = Math.floor(Math.random() * size);
            if (grid[r][c] !== -1) { grid[r][c] = -1; placed++; }
        }

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === -1) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === -1) count++;
                    }
                }
                grid[r] = grid[r] || [];
                grid[r][c] = count;
            }
        }

        const display = grid.map(r => r.map(c => c === -1 ? '💣' : c === 0 ? '⬜' : `${c}`).join('')).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Minesweeper (${diff})`, description: display, footer: { text: `${mineCount} mines on a ${size}x${size} grid` } })] });
    }
};
