const fs = require('fs');
const path = require('path');
const { COLORS } = require('../../utils/styles');

let cached = null;

function loadCounts() {
    if (cached) return cached;
    try {
        const raw = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'pfps.json'), 'utf8');
        const data = JSON.parse(raw);
        cached = {
            Females: (data.females || []).length,
            Males: (data.males || []).length,
            Animes: (data.animes || []).length,
            Banners: (data.banners || []).length
        };
    } catch {
        cached = { Females: 0, Males: 0, Animes: 0, Banners: 0 };
    }
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
