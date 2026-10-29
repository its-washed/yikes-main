const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { confirm } = require('../../utils/moderation');
const { createEmbed, COLORS } = require('../../utils/embeds');
const { ensureEconomy } = require('../../utils/predicates');
const { humanize, cleanHumanize, logging } = require('../../utils/econ');
const { EMOJIS } = require('../../utils/styles');

function parseTransferAmount(token, card) {
    const raw = String(token).toLowerCase().replace(/,/g, '');
    if (raw === 'all') return card;
    if (raw === 'half') return Math.floor(card / 2);
    const pct = /^(\d+(?:\.\d+)?)%$/.exec(raw);
    if (pct) {
        const percentage = parseFloat(pct[1]) / 100;
        if (percentage < 0.01 || percentage > 1) return null;
        return Math.floor(card * percentage);
    }
    if (raw.endsWith('k')) return Math.floor(parseFloat(raw) * 1000);
    if (raw.endsWith('m')) return Math.floor(parseFloat(raw) * 1000000);
    if (raw.endsWith('b')) return Math.floor(parseFloat(raw) * 1000000000);
    const value = Number(raw);
    return Number.isFinite(value) ? value : NaN;
}

module.exports = {
    data: { name: 'transfer', description: 'Transfer cash to a member', usage: ',transfer its_washed 125', params: ['member', 'amount'] },
    aliases: ['give', 'pay'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const mentioned = message.mentions.users.first();
        const tokens = [...args];
        if (mentioned) {
            const idx = tokens.findIndex(t => /^<@!?\d+>$/.test(t));
            if (idx !== -1) tokens.splice(idx, 1);
        } else if (/^\d{17,20}$/.test(tokens[0] || '')) {
            const id = tokens.shift();
            const fetched = await client.users.fetch(id).catch(() => null);
            if (fetched) var resolved = fetched;
        }
        const member = mentioned || (typeof resolved !== 'undefined' ? resolved : null);

        if (!member) return warn(message, 'Usage: `transfer <member> <amount>`');
        if (member.id === message.author.id) return warn(message, "You can't transfer money to yourself.");
        if (member.bot) return warn(message, 'You can\'t transfer money to a bot.');

        const receiverRow = first('SELECT * FROM economy WHERE user_id = ?', member.id);
        if (!receiverRow) return warn(message, `Member **${member.username}** does not have an economy account created`);

        const senderCard = Number(first('SELECT card FROM economy WHERE user_id = ?', message.author.id)?.card || 0);
        if (senderCard <= 0) return warn(message, "You don't have enough money on your **card** to use.");

        const amountToken = tokens[0];
        if (!amountToken) return warn(message, 'Usage: `transfer <member> <amount>`');
        if (String(amountToken).toLowerCase() === 'nan' || String(amountToken).toLowerCase() === 'inf') {
            return warn(message, `**${amountToken}** is **not** a number`);
        }

        let amount = parseTransferAmount(amountToken, senderCard);
        if (amount === null) return warn(message, 'Percentage must be between 1% and 100%');
        if (Number.isNaN(amount)) return warn(message, `**${amountToken}** is **not** a number`);
        if (amount <= 0) return warn(message, "You can't transfer **0** 💳");
        if (senderCard < amount) return warn(message, "You don't have enough money on your **card** to transfer");

        const receiver = { card: Number(receiverRow.card || 0), item_bank: Number(receiverRow.item_bank || 0) };
        if (receiver.card + amount > receiver.item_bank) {
            const space = receiver.item_bank - receiver.card;
            return warn(message, `${member} can only accept **${humanize(space)}** 💵 more due to the bank limit`);
        }

        return confirm(
            message,
            `${message.author.mention}: Are you sure you want to transfer **${humanize(amount)}** 💵 to ${member.mention}?\n> **Important:** When transferring money, a tax of 25% is charged.`,
            async i => {
                const sender = first('SELECT cash, card FROM economy WHERE user_id = ?', message.author.id);
                const recv = first('SELECT cash, card, item_bank FROM economy WHERE user_id = ?', member.id);
                if (!sender || !recv) {
                    return i.update({
                        embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} Missing economy account` })],
                        components: []
                    }).catch(() => {});
                }
                if (Number(sender.card) < amount) {
                    return i.update({
                        embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} You don't have enough money on your **card** to transfer` })],
                        components: []
                    }).catch(() => {});
                }
                const tax = Math.floor(amount * 0.25);
                const received = amount - tax;
                run('UPDATE economy SET card = card - ? WHERE user_id = ?', amount, message.author.id);
                run('UPDATE economy SET card = card + ? WHERE user_id = ?', received, member.id);
                logging(message.author.id, amount, 'transfer', 'transfer');
                return i.update({
                    embeds: [createEmbed({
                        color: COLORS.SUCCESS,
                        description: `${EMOJIS.APPROVE} ${i.user.mention}: Successfully transferred **${humanize(amount)}** 💵 to ${member.mention}\n> **Tax:** ${humanize(tax)} 💵 • **Received:** ${cleanHumanize(received)} 💵`
                    })],
                    components: []
                }).catch(() => {});
            },
            async i => {
                return i.update({
                    embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Transfer got canceled` })],
                    components: []
                }).catch(() => {});
            }
        );
    }
};
