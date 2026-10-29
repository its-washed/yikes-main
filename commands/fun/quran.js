const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'quran', description: 'Get a random quran verse', usage: ',quran' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let result = null;
        try {
            const res = await fetch('https://api.evelina.bot/fun/quran?key=X3pZmLq82VnHYTd6Cr9eAw');
            if (res.ok) result = await res.json();
        } catch (err) {
            result = null;
        }
        if (!result || !result.data || !Array.isArray(result.data.surahs)) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a quran verse.')] });
        }
        const surahs = result.data.surahs;
        const allAyahs = [];
        for (const surah of surahs) {
            for (const ayah of (surah.ayahs || [])) allAyahs.push({ surah, ayah });
        }
        if (!allAyahs.length) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a quran verse.')] });
        }
        const pick = allAyahs[Math.floor(Math.random() * allAyahs.length)];
        const surah = pick.surah;
        if (!surah) {
            return message.reply('Surah not found for this Ayah.');
        }
        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description: `**${pick.surah.number}:${pick.ayah.numberInSurah}** - **${pick.surah.name}** (\`${pick.surah.englishName}\`)\n ${pick.ayah.text}`
        });
        return message.reply({ embeds: [embed] });
    }
};
