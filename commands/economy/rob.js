const { warn, approve } = require('../../utils/context');
const { first, run } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const { humanize, logging } = require('../../utils/econ');
const { isDeveloper } = require('../../utils/developer');

const CASH = '💵';

module.exports = {
    data: { name: 'rob', description: "Attempt to steal money from another player", usage: ',rob its_washed', params: ['member'] },
    aliases: [],
    cooldown: 300,

    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const member = message.mentions.members.first();
        if (!member) return warn(message, 'You must mention a member\n> Usage: `rob its_washed`');

        if (isDeveloper(member.id)) return warn(message, "You can't steal money from a bot owner");
        if (member.id === message.author.id) return warn(message, "You can't steal from yourself!");

        const check = first('SELECT cash, card FROM economy WHERE user_id = ?', message.author.id);
        const targetBalance = Number(first('SELECT cash FROM economy WHERE user_id = ?', member.id)?.cash || 0);
        if (!targetBalance || targetBalance < 10) return warn(message, `**${member.user.username}** has no money to steal.`);
        if (!check) return warn(message, `**${member.user.username}** has no money to steal.`);
        if (Number(check.card) < 50000) return warn(message, `You need at least **50,000** ${CASH} on your card to rob someone.`);

        let robChance = 1.0;
        const cardUsed = first('SELECT * FROM economy_cards_used WHERE user_id = ? AND business = ?', member.id, 'personal');
        if (cardUsed) {
            const cardUser = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ?', member.id, cardUsed.card_id);
            if (cardUser) {
                const cardInfo = first('SELECT * FROM economy_cards WHERE id = ?', cardUser.card_id);
                if (cardInfo) robChance = (100 - Number(cardUser.storage)) / 100;
            }
        }

        if (Math.random() < robChance) {
            const stolenAmount = Math.round(targetBalance * 0.1 * 100) / 100;
            const realStolenAmount = stolenAmount > 1000000 ? 1000000 : stolenAmount;
            run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', stolenAmount, member.id);
            run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', realStolenAmount, message.author.id);
            run('UPDATE economy SET rob = ? WHERE user_id = ?', Math.floor((Date.now() + 3 * 3600000) / 1000), message.author.id);
            logging(message.author.id, realStolenAmount, 'rob', `<@${member.id}>`);
            logging(member.id, stolenAmount, 'robbed', `<@${message.author.id}>`);
            return approve(message, `You stole **${humanize(realStolenAmount)}** ${CASH} from **${member.user.username}**`);
        }

        const penalty = Math.round(Number(check.card) * 0.05 * 100) / 100;
        run('UPDATE economy SET card = card - ? WHERE user_id = ?', penalty, message.author.id);
        run('UPDATE economy SET rob = ? WHERE user_id = ?', Math.floor((Date.now() + 3 * 3600000) / 1000), message.author.id);
        logging(message.author.id, penalty, 'catched', `<@${member.id}>`);
        return warn(message, `Caught! You failed to steal from **${member}** and lost **5%** (\`${humanize(penalty)}\`) of your **card** balance.`);
    }
};
