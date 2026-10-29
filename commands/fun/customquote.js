const { sendQuoteCard } = require('../../utils/quoteCard');
const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'customquote', description: 'Create a custom quote', usage: ',customquote <user> <text>' },
    aliases: ['cq'],
    cooldown: 3,
    async execute(message, args, client) {
        let user = message.mentions.users.first();
        const tokens = [...args];

        if (user) {
            const mentionIdx = tokens.findIndex(t => /^<@!?\d+>$/.test(t));
            if (mentionIdx !== -1) tokens.splice(mentionIdx, 1);
        } else if (/^\d{17,20}$/.test(tokens[0] || '')) {
            user = await client.users.fetch(tokens.shift()).catch(() => null);
        }

        if (!user) return warn(message, `Usage: \`${require('../../utils/moderation').prefix(message)}customquote its_washed text\``);

        const text = tokens.join(' ').trim();
        if (!text) return warn(message, `Usage: \`${require('../../utils/moderation').prefix(message)}customquote its_washed text\``);

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        const displayName = member ? member.displayName : (user.displayName || user.username);

        const sent = await sendQuoteCard(message, {
            text: text.slice(0, 800),
            displayName,
            username: user.username,
            avatarUrl: user.displayAvatarURL({ size: 512 })
        });

        await message.delete().catch(() => {});
        return sent;
    }
};
