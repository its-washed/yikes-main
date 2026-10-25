const { errorEmbed } = require('../../utils/embeds');
const { sendQuoteCard } = require('../../utils/quoteCard');

module.exports = {
    data: { name: 'cq', description: 'Create a custom quote', usage: ',cq <@user|userId> <text>' },
    aliases: ['customquote'],
    cooldown: 3,
    async execute(message, args, client) {
        let user = message.mentions.users.first();
        const tokens = [...args];

        if (user) {
            const mentionIdx = tokens.findIndex(t => /^<@!?\d+>$/.test(t));
            if (mentionIdx !== -1) tokens.splice(mentionIdx, 1);
        } else if (/^\d{17,20}$/.test(tokens[0] || '')) {
            user = await client.users.fetch(tokens.shift()).catch(() => null);
            if (!user) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });
        }

        if (!user) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,cq <@user|userId> <text>')] });

        const text = tokens.join(' ').trim();
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,cq <@user|userId> <text>')] });

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        const displayName = member?.displayName || user.displayName || user.username;
        const username = user.username;
        const avatarUrl = user.displayAvatarURL({ size: 512 });

        return sendQuoteCard(message, { text: text.slice(0, 800), displayName, username, avatarUrl });
    }
};
