const { warn, paginate } = require('../../utils/context');

function capitalize(text) {
    const value = String(text || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function convertHistory(text) {
    if (!text) return null;
    const matches = String(text).match(/#[\d]+/);
    if (!matches) return null;
    let names = [String(text)];
    for (const match of matches) {
        const newNames = [];
        for (const name of names) {
            const index = name.indexOf(match);
            if (index === -1) { newNames.push(name); continue; }
            const start = name.slice(0, index);
            const end = name.slice(index + match.length);
            const raw = match.slice(1);
            const num = Number(raw);
            if (Number.isNaN(num)) { newNames.push(name); continue; }
            const pad = raw.length;
            if (String(num).length > pad) { newNames.push(name); continue; }
            for (let i = 0; i <= num; i++) newNames.push(`${start}${String(i).padStart(pad, '0')}${end}`);
        }
        names = newNames;
    }
    return names;
}

module.exports = {
    data: { name: 'names', description: 'View username and nickname history of a member or yourself', usage: ',names its_washed', params: ['[user]'] },
    aliases: ['pastusernames', 'usernames', 'oldnames', 'pastnames'],
    cooldown: 3,

    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const { query } = require('../../utils/database');
        const usernameResults = query('SELECT * FROM usernames WHERE user_id = ?', user.id);
        const nicknameResults = query('SELECT * FROM nicknames WHERE user_id = ?', user.id);
        if (!usernameResults.length && !nicknameResults.length) {
            const who = user.id === message.author.id ? ' You don' : `${user} doesn`;
            return warn(message, `${who}t have **past usernames or nicknames**`);
        }

        const combined = [
            ...usernameResults.map((row) => ({ type: 'U', name: capitalize(row.username), time: row.timestamp })),
            ...nicknameResults.map((row) => ({ type: 'N', name: capitalize(row.nickname), time: row.timestamp }))
        ].sort((a, b) => b.time - a.time);

        const entries = combined.map((entry) => {
            const base = `\`${entry.name.length > 40 ? entry.name.slice(0, 40) + '...' : entry.name}\` ${entry.type} - <t:${Math.floor(entry.time)}:R>`;
            const expanded = convertHistory(entry.name);
            if (expanded && expanded.length > 1 && expanded.length <= 10) {
                const subs = expanded.slice(0, 10).map((n, i) => `**${i + 1}.** ${n}`).join(', ');
                return `${base}\n${subs}`;
            }
            return base;
        });

        return paginate(message, entries, 'Name changes', {
            name: user.username,
            icon_url: user.avatarURL() || user.defaultAvatarURL()
        }, { perPage: 6 });
    }
};
