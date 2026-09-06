const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'blackjack', description: 'Play blackjack', usage: ',blackjack' },
    aliases: ['bj'],
    cooldown: 15,
    async execute(message) {
        const deck = [];
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        for (const s of suits) for (const v of values) deck.push({ suit: s, value: v });
        deck.sort(() => Math.random() - 0.5);

        const hand = [deck.pop(), deck.pop()];
        const dealer = [deck.pop(), deck.pop()];

        const handVal = (h) => {
            let val = 0, aces = 0;
            for (const c of h) {
                if (c.value === 'A') { val += 11; aces++; }
                else if (['K','Q','J'].includes(c.value)) val += 10;
                else val += parseInt(c.value);
            }
            while (val > 21 && aces > 0) { val -= 10; aces--; }
            return val;
        };

        const renderHand = (h) => h.map(c => `${c.value}${c.suit}`).join(' ');

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7, title: 'Blackjack',
                description: `**Your Hand:** ${renderHand(hand)} (${handVal(hand)})\n**Dealer:** ${dealer[0].value}${dealer[0].suit} ??\n\nReact ✅ to hit, ❌ to stand.`
            })]
        });

        await msg.react('✅');
        await msg.react('❌');

        const filter = (r, u) => u.id === message.author.id && ['✅', '❌'].includes(r.emoji.name);
        const collector = msg.createReactionCollector({ filter, time: 30000 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '✅') {
                hand.push(deck.pop());
                const val = handVal(hand);
                if (val > 21) {
                    await msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Bust!', description: `**${renderHand(hand)}** (${val})\nDealer: **${renderHand(dealer)}** (${handVal(dealer)})` })] });
                    await msg.reactions.removeAll();
                    collector.stop();
                    return;
                }
                await msg.edit({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Blackjack', description: `**Your Hand:** ${renderHand(hand)} (${val})\n**Dealer:** ${dealer[0].value}${dealer[0].suit} ??` })] });
            } else {
                let dVal = handVal(dealer);
                while (dVal < 17) { dealer.push(deck.pop()); dVal = handVal(dealer); }
                const pVal = handVal(hand);
                const result = dVal > 21 ? 'Dealer busts! You win!' : pVal > dVal ? 'You win!' : pVal < dVal ? 'Dealer wins!' : 'Push!';
                const color = result.includes('win') && !result.includes('Dealer') ? 0x00d26a : result.includes('Push') ? 0xfbbf24 : 0xff4757;
                await msg.edit({ embeds: [createEmbed({ color, title: 'Blackjack', description: `**Your Hand:** ${renderHand(hand)} (${pVal})\n**Dealer:** ${renderHand(dealer)} (${dVal})\n\n**${result}**` })] });
                await msg.reactions.removeAll();
                collector.stop();
            }
        });
    }
};
