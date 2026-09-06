const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rps2', description: 'Best of 5 RPS', usage: ',rps2 [@user]' },
    aliases: ['rps5'],
    cooldown: 60,
    async execute(message) {
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply({ embeds: [errorEmbed('Missing Opponent', 'Usage: ,rps2 [@user]')] });
        if (opponent.id === message.author.id || opponent.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'Pick a real opponent.')] });

        const choices = ['rock', 'paper', 'scissors'];
        let p1Score = 0, p2Score = 0;

        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'RPS Best of 5', description: `${message.author.tag} vs ${opponent.tag}\n\nFirst to 3 wins!\n\n${message.author}, type your choice: rock, paper, or scissors.` })] });

        const filter = m => (m.author.id === message.author.id || m.author.id === opponent.id) && choices.includes(m.content.toLowerCase());
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        const p1Choice = new Promise(resolve => {
            const f = m => m.author.id === message.author.id && choices.includes(m.content.toLowerCase());
            const c = message.channel.createMessageCollector({ filter: f, max: 1, time: 30000 });
            c.on('collect', m => resolve(m.content.toLowerCase()));
        });

        const p2Choice = new Promise(resolve => {
            const f = m => m.author.id === opponent.id && choices.includes(m.content.toLowerCase());
            const c = message.channel.createMessageCollector({ filter: f, max: 1, time: 30000 });
            c.on('collect', m => resolve(m.content.toLowerCase()));
        });

        const [c1, c2] = await Promise.all([p1Choice, p2Choice]);

        if (c1 === c2) {
            await msg.edit({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Draw!', description: `Both chose **${c1}**!` })] });
        } else if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) {
            p1Score = 3;
            await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: `${message.author.tag} Wins!`, description: `${c1} beats ${c2}` })] });
        } else {
            p2Score = 3;
            await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: `${opponent.tag} Wins!`, description: `${c2} beats ${c1}` })] });
        }
    }
};
