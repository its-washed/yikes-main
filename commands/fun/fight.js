const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'fight', description: 'Fight another user', usage: ',fight [@user]' },
    aliases: [],
    cooldown: 30,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing Opponent', 'Usage: ,fight [@user]')] });
        if (target.id === message.author.id || target.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'Pick a real opponent.')] });

        const actions = ['punch', 'kick', 'dodge', 'block', 'slap', 'tackle', 'uppercut', 'sweep'];
        const playerHP = 100;
        const enemyHP = 100;

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Fight!', description: `${message.author.tag} vs ${target.tag}\n\nReact ⚔️ to fight!` })] });
        await msg.react('⚔️');

        const filter = (r, u) => u.id === message.author.id && r.emoji.name === '⚔️';
        const collector = msg.createReactionCollector({ filter, time: 60000 });

        collector.on('collect', async () => {
            const pAction = actions[Math.floor(Math.random() * actions.length)];
            const eAction = actions[Math.floor(Math.random() * actions.length)];
            const pDmg = Math.floor(Math.random() * 25) + 5;
            const eDmg = Math.floor(Math.random() * 25) + 5;

            await msg.edit({ embeds: [createEmbed({
                color: 0xff4757, title: 'Fight!',
                description: `**${message.author.tag}** uses **${pAction}** for **${pDmg}** damage!\n**${target.tag}** uses **${eAction}** for **${eDmg}** damage!\n\nHP: ${message.author.tag} **${Math.max(playerHP - eDmg, 0)}** | ${target.tag} **${Math.max(enemyHP - pDmg, 0)}**`
            })] });
        });
    }
};
