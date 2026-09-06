const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'hungergames', description: 'Simulate a hunger games round', usage: ',hungergames' },
    aliases: ['hg', 'arena'],
    cooldown: 30,
    async execute(message) {
        const players = message.guild.members.cache.filter(m => !m.user.bot).random(4);
        if (players.length < 2) return message.reply({ embeds: [errorEmbed('Not Enough Players', 'Need at least 2 players.')] });

        const events = [
            '{player} finds a backpack with supplies.',
            '{player} grabs a knife from the cornucopia.',
            '{player} runs into the forest.',
            '{player} gets into a fight with {target} and wins.',
            '{player} finds a hidden stash of food.',
            '{player} falls into a trap but escapes.',
            '{player} forms an alliance with {target}.',
            '{player} is ambushed by {target}!',
            '{player} finds a first aid kit.',
            '{player} almost gets caught by a muttation.'
        ];

        const log = [];
        let alive = [...players];

        for (let i = 0; i < 5 && alive.length > 1; i++) {
            const event = events[Math.floor(Math.random() * events.length)];
            const player = alive[Math.floor(Math.random() * alive.length)];
            let target = alive.filter(p => p.id !== player.id)[Math.floor(Math.random() * (alive.length - 1))];
            if (!target) target = player;

            log.push(event.replace(/{player}/g, `**${player.user.tag}**`).replace(/{target}/g, `**${target.user.tag}**`));

            if (event.includes('fight') && Math.random() > 0.5) {
                alive = alive.filter(p => p.id !== target.id);
            } else if (event.includes('ambushed') && Math.random() > 0.5) {
                alive = alive.filter(p => p.id !== player.id);
            }
        }

        const winner = alive.length > 0 ? alive[0] : players[0];
        return message.reply({
            embeds: [createEmbed({
                color: 0xff4757, title: 'Hunger Games',
                description: log.join('\n') + `\n\n**Winner:** ${winner.user.tag}! 🏆`
            })]
        });
    }
};
