const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'tictactoe', description: 'Play tic-tac-toe', usage: ',tictactoe [@user]' },
    aliases: ['ttt'],
    cooldown: 30,
    async execute(message) {
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply({ embeds: [errorEmbed('Missing Opponent', 'Usage: ,tictactoe [@user]')] });
        if (opponent.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid', 'You can\'t play against yourself.')] });
        if (opponent.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'You can\'t play against a bot.')] });

        const board = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        let current = '❌';
        const marks = {};

        const renderBoard = () => board.map((v, i) => marks[i] || v).join('');

        const msg = await message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Tic-Tac-Toe', description: `${message.author.tag} (❌) vs ${opponent.tag} (⭕)\n\n${renderBoard()}\n\n${current === '❌' ? message.author : opponent}'s turn.` })]
        });

        for (let i = 0; i < 9; i++) await msg.react(['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][i]);

        const filter = (r, u) => (u.id === message.author.id || u.id === opponent.id) && !r.message.author.bot;
        const collector = msg.createReactionCollector({ filter, time: 120000 });

        collector.on('collect', async (reaction, user) => {
            const idx = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'].indexOf(reaction.emoji.name);
            if (idx === -1 || marks[idx]) return;
            if ((current === '❌' && user.id !== message.author.id) || (current === '⭕' && user.id !== opponent.id)) return;

            marks[idx] = current;
            const winner = checkWin(marks);

            if (winner) {
                const winnerUser = winner === '❌' ? message.author : opponent;
                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'Game Over!', description: `${winnerUser.tag} wins!\n\n${renderBoard()}` })] });
                await msg.reactions.removeAll();
                collector.stop();
                return;
            }

            if (Object.keys(marks).length === 9) {
                await msg.edit({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Draw!', description: `Nobody won!\n\n${renderBoard()}` })] });
                await msg.reactions.removeAll();
                collector.stop();
                return;
            }

            current = current === '❌' ? '⭕' : '❌';
            await msg.edit({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Tic-Tac-Toe', description: `${message.author.tag} (❌) vs ${opponent.tag} (⭕)\n\n${renderBoard()}\n\n${current === '❌' ? message.author : opponent}'s turn.` })] });
            await reaction.users.remove(user.id);
        });
    }
};

function checkWin(marks) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of lines) {
        if (marks[a] && marks[a] === marks[b] && marks[a] === marks[c]) return marks[a];
    }
    return null;
}
