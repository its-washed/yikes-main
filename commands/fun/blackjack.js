const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, parseBet } = require('../../utils/economy');

module.exports = {
    data: { name: 'blackjack', description: "Start a blackjack game", usage: ',blackjack [bet/all/half/%]' },
    aliases: ['bj'],
    cooldown: 15,
    async execute(message, args) {
        const user = getUser(message.author.id);
        const bet = parseBet(args[0], user.wallet);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,blackjack [bet/all/half/%]')] });
        if (bet < 10) return message.reply({ embeds: [errorEmbed('Invalid Bet', "You can't bet less than **10** 💵")] });
        if (bet > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

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

        let settled = false;
        const settle = (delta) => {
            settled = true;
            updateWallet(message.author.id, delta);
        };

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x729bb0,
                title: `Playing Blackjack with ${bet.toLocaleString('en-US')} 💵`,
                fields: [
                    { name: `${message.author}`, value: "Hit 'Hit' to start the game.", inline: true },
                    { name: 'Dealer', value: "Hit 'Hit' to start the game.", inline: true }
                ],
                description: `**Your Hand:** ${renderHand(hand)} (${handVal(hand)})\n**Dealer:** ${dealer[0].value}${dealer[0].suit} ??\n**Bet:** $${bet.toLocaleString()}\n\nReact ✅ to hit, ❌ to stand.`
            })]
        });

        await msg.react('✅');
        await msg.react('❌');

        const filter = (r, u) => u.id === message.author.id && ['✅', '❌'].includes(r.emoji.name);
        const collector = msg.createReactionCollector({ filter, time: 30000 });

        const stand = async () => {
            let dVal = handVal(dealer);
            while (dVal < 17) { dealer.push(deck.pop()); dVal = handVal(dealer); }
            const pVal = handVal(hand);
            const result = dVal > 21 ? 'Dealer busts! You win!' : pVal > dVal ? 'You win!' : pVal < dVal ? 'Dealer wins!' : 'Push!';
            const color = result.includes('win') && !result.includes('Dealer') ? 0x39ffb8 : result.includes('Push') ? 0xffd600 : 0xff3939;
            let outcome = '';
            if (result === 'Push!') {
                settled = true;
            } else if (result === 'Dealer wins!') {
                settle(-bet);
                outcome = `\nYou lost **$${bet.toLocaleString()}**.`;
            } else {
                settle(bet);
                outcome = `\nYou won **$${bet.toLocaleString()}**.`;
            }
            await msg.edit({ embeds: [createEmbed({ color, title: 'Blackjack', description: `**Your Hand:** ${renderHand(hand)} (${pVal})\n**Dealer:** ${renderHand(dealer)} (${dVal})\n\n**${result}**${outcome}` })] });
            msg.reactions.removeAll().catch(() => {});
            collector.stop();
        };

        collector.on('collect', async (reaction) => {
            if (settled) return;
            if (reaction.emoji.name === '✅') {
                hand.push(deck.pop());
                const val = handVal(hand);
                if (val > 21) {
                    settle(-bet);
                    await msg.edit({ embeds: [createEmbed({ color: 0xff3939, title: 'Bust!', description: `**${renderHand(hand)}** (${val})\nDealer: **${renderHand(dealer)}** (${handVal(dealer)})\n\nYou lost **$${bet.toLocaleString()}**.` })] });
                    msg.reactions.removeAll().catch(() => {});
                    collector.stop();
                    return;
                }
                await msg.edit({ embeds: [createEmbed({ color: 0x729bb0, title: 'Blackjack', description: `**Your Hand:** ${renderHand(hand)} (${val})\n**Dealer:** ${dealer[0].value}${dealer[0].suit} ??` })] });
            } else {
                await stand();
            }
        });

        collector.on('end', async () => {
            if (settled) return;
            await stand().catch(() => {});
        });
    }
};
