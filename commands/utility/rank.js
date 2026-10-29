const { query, first } = require('../../utils/database');
const { getLevelData, calculateTotalXp } = require('../../utils/levels');

function memberTarget(message, args) {
    const mentioned = message.mentions.members.first() || message.mentions.users.first();
    if (mentioned) return mentioned;
    const raw = (args[0] || '').replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(raw)) {
        return message.guild.members.cache.get(raw) ||
            message.client.users.cache.get(raw) ||
            null;
    }
    return message.member;
}

function progressBar(percentage) {
    const length = 10;
    let filled = Math.trunc(length * percentage);
    if (filled < 0) filled = 0;
    if (filled > length) filled = length;
    const blue = '🔵';
    const white = '⚪';
    if (filled === 0) return white.repeat(length);
    if (filled === length) return blue.repeat(length);
    return blue.repeat(filled) + white.repeat(length - filled);
}

module.exports = {
    data: {
        name: 'rank',
        description: 'View your level and experience',
        usage: ',rank its_washed', params: ['[user]']
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        const target = memberTarget(message, args) || message.member;
        const results = query('SELECT user_id, xp, level, target_xp FROM level_user WHERE guild_id = ?', message.guild.id) || [];
        const sorted = [...results].sort((a, b) => (b.level - a.level) || (b.xp - a.xp));
        const rankIndex = sorted.findIndex(row => String(row.user_id) === target.id);
        if (rankIndex === -1) {
            return message.reply({
                embeds: [{
                    color: 0xffd600,
                    description: `${message.author}: This member doesn't have a rank recorded`
                }]
            });
        }
        const row = sorted[rankIndex];
        const level = row.level || 0;
        const xp = row.xp || 0;
        const targetXp = row.target_xp || 100;
        const progress = targetXp > 0 ? xp / targetXp : 0;
        const avatar = target.user ? target.user.displayAvatarURL() : target.displayAvatarURL();

        return message.reply({
            embeds: [{
                color: 0x729bb0,
                author: { name: String(target.user ? target.user.tag || target.user : target), icon_url: avatar },
                thumbnail: { url: avatar },
                fields: [
                    { name: 'Level', value: `${level}`, inline: true },
                    { name: 'Server Rank', value: `#${rankIndex + 1} out of ${sorted.length}`, inline: true },
                    { name: 'Experience', value: `${xp}/${targetXp} XP`, inline: true },
                    { name: `Progress (${(progress * 100).toFixed(2)}%)`, value: progressBar(progress), inline: false }
                ],
                footer: { text: `Total Experience: ${calculateTotalXp(level, xp).toLocaleString('en-US')}` },
                timestamp: message.createdAt.toISOString()
            }]
        });
    }
};
