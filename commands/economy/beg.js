const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run, first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

function money(value) {
    const n = Number(value) || 0;
    const ip = Math.trunc(n).toLocaleString('en-US');
    if (ip.replace(/,/g, '').length <= 10) {
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const omitted = ip.replace(/,/g, '').length - 10;
    return `${ip.slice(0, 10)}... (+${omitted})`;
}

module.exports = {
    data: { name: 'beg', description: 'Beg for money', usage: ',beg' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const row = E.ensureAccount(message.author.id);
        const now = Date.now() / 1000;
        if (row.beg && row.beg > now) {
            return warn(message, `This command is on cooldown\n> Available <t:${Math.floor(row.beg)}:R>`);
        }
        if ((Number(row.cash) || 0) + (Number(row.card) || 0) > 100000) {
            return warn(message, `You can't beg if you have more than **100.000** 💵`);
        }

        const config = first('SELECT beg_min, beg_max FROM economy_config WHERE active = 1')
            || { beg_min: 100, beg_max: 500 };
        const received = config.beg_min + Math.random() * (config.beg_max - config.beg_min);

        E.addCollectMoney(message.author.id, 'beg', received);
        run('UPDATE economy SET beg = ?, cash = cash + ? WHERE user_id = ?', Math.floor(now + 60), received, message.author.id);
        E.logging(message.author.id, received, 'collect', 'beg');

        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                description: `🙏 ${message.author}: You begged and received **${money(received)}** 💵`
            })]
        });
    }
};
