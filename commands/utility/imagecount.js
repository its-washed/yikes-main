const { COLORS } = require('../../utils/styles');
const { query } = require('../../utils/database');

const LABELS = { females: 'Females', males: 'Males', animes: 'Animes', banners: 'Banners' };

let cached = null;

function loadCounts() {
    if (cached) return cached;
    const counts = { Females: 0, Males: 0, Animes: 0, Banners: 0 };
    try {
        for (const row of query('SELECT category, COUNT(*) AS total FROM image_pool GROUP BY category')) {
            const label = LABELS[String(row.category).toLowerCase()];
            if (label) counts[label] = Number(row.total) || 0;
        }
    } catch {
        cached = { Females: 0, Males: 0, Animes: 0, Banners: 0 };
        return cached;
    }
    cached = counts;
    return cached;
}

module.exports = {
    data: { name: 'imagecount', description: 'Get the count of how much images are available for every category', usage: ',imagecount' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        const counts = loadCounts();
        const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: `Image Counts (${total.toLocaleString('en-US')})`,
                author: { name: client.user.username, icon_url: client.user.displayAvatarURL() },
                description: Object.entries(counts).map(([key, value]) => `**${key}:** \`${value.toLocaleString('en-US')}\``).join('\n')
            }]
        });
    }
};
