const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run, first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'slut', description: 'Work as a prostitute for money', usage: ',slut' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const row = E.ensureAccount(message.author.id);
        const now = Date.now() / 1000;
        if (row.slut && row.slut > now) {
            return warn(message, `This command is on cooldown\n> Available <t:${Math.floor(row.slut)}:R>`);
        }

        const config = first('SELECT slut_min, slut_max FROM economy_config WHERE active = 1')
            || { slut_min: 50, slut_max: 300 };
        const received = config.slut_min + Math.random() * (config.slut_max - config.slut_min);

        E.addCollectMoney(message.author.id, 'slut', received);
        run('UPDATE economy SET slut = ?, cash = cash + ? WHERE user_id = ?', Math.floor(now + 3600), received, message.author.id);
        E.logging(message.author.id, received, 'collect', 'slut');

        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                description: `💋 ${message.author}: You worked as a **prostitute** and earned **${E.humanize(received)}** 💵`
            })]
        });
    }
};
