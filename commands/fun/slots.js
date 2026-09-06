const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'slots', description: 'Play the slot machine', usage: ',slots [bet]' },
    aliases: ['slot', 'spin'],
    cooldown: 5,
    async execute(message, args) {
        const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔'];
        const s1 = symbols[Math.floor(Math.random() * symbols.length)];
        const s2 = symbols[Math.floor(Math.random() * symbols.length)];
        const s3 = symbols[Math.floor(Math.random() * symbols.length)];

        let payout = 'Nothing!';
        let color = 0xff4757;
        if (s1 === s2 && s2 === s3) {
            payout = 'JACKPOT!';
            color = 0x00d26a;
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            payout = 'Small Win!';
            color = 0xfbbf24;
        }

        return message.reply({
            embeds: [createEmbed({
                color,
                title: 'Slot Machine',
                description: `🎰 **${s1} ${s2} ${s3}** 🎰\n\n**${payout}**`
            })]
        });
    }
};
