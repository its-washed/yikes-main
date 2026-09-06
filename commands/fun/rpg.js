const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rpg', description: 'Play a text RPG', usage: ',rpg' },
    aliases: ['adventure'],
    cooldown: 60,
    async execute(message) {
        const encounters = [
            { text: 'You find a treasure chest!', hp: 10, gold: 20 },
            { text: 'A goblin attacks you!', hp: -15, gold: 5 },
            { text: 'You find a healing spring.', hp: 20, gold: 0 },
            { text: 'You discover a merchant.', hp: 0, gold: 30 },
            { text: 'You step on a trap!', hp: -10, gold: 0 },
            { text: 'You find a hidden cave.', hp: 0, gold: 50 },
            { text: 'A dragon appears!', hp: -30, gold: 100 },
            { text: 'You find a magic sword.', hp: 5, gold: 10 }
        ];

        let hp = 100, gold = 0, turn = 0;
        const log = [];

        for (let i = 0; i < 5; i++) {
            const enc = encounters[Math.floor(Math.random() * encounters.length)];
            hp += enc.hp;
            gold += enc.gold;
            log.push(`${enc.text} (${enc.hp >= 0 ? '+' : ''}${enc.hp} HP, ${enc.gold >= 0 ? '+' : ''}${enc.gold} gold)`);
            if (hp <= 0) break;
        }

        const survived = hp > 0;
        return message.reply({
            embeds: [createEmbed({
                color: survived ? 0x00d26a : 0xff4757, title: 'RPG Adventure',
                description: log.join('\n') + `\n\n**HP:** ${hp} | **Gold:** ${gold}\n\n${survived ? 'You survived!' : 'You died!'}`
            })]
        });
    }
};
