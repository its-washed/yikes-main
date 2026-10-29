const { first, run } = require('../../utils/database');
const { COLORS, EMOJIS } = require('../../utils/styles');

const cooldowns = new Map();

module.exports = {
    data: { name: 'smoke', description: 'Hit the vape', usage: ',smoke' },
    aliases: [],
    cooldown: 30,

    async execute(message) {
        const key = `smoke-${message.author.id}`;
        const now = Date.now();
        if ((cooldowns.get(key) || 0) > now) return;
        cooldowns.set(key, now + 30000);

        const loading = await message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: 'Hitting the **blunt**...' }] });

        const check = first('SELECT 1 AS ok FROM smoke WHERE user_id = ?', message.author.id);
        if (check) {
            run('UPDATE smoke SET hits = hits + 1 WHERE user_id = ?', message.author.id);
        } else {
            run('INSERT INTO smoke (user_id, hits) VALUES (?, ?)', message.author.id, 1);
        }
        const row = first('SELECT hits FROM smoke WHERE user_id = ?', message.author.id);

        await new Promise(resolve => setTimeout(resolve, 2000 + Math.floor(Math.random() * 3000)));

        const embed = {
            color: COLORS.SUCCESS,
            description: `${EMOJIS.APPROVE} ${message.author}: Took a hit from the blunt! You have \`${row.hits}\` hits`
        };
        return loading.edit({ embeds: [embed] }).catch(() => message.reply({ embeds: [embed] }));
    }
};
