const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'poll2',
        description: 'Advanced poll with time limit',
        usage: ',poll2 [time] [question] | [options]'
    },
    aliases: ['timedpoll'],
    cooldown: 30,

    async execute(message, args) {
        const content = args.join(' ');
        if (!content) return message.reply({ embeds: [errorEmbed('Missing Content', 'Usage: ,poll2 [time] [question] | [option1] | [option2]')] });

        const timeMatch = content.match(/^(\d+)(s|m|h)\s+/);
        let timeMs = 0;
        let question = content;

        if (timeMatch) {
            const amount = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            const units = { s: 1000, m: 60000, h: 3600000 };
            timeMs = amount * units[unit];
            question = content.slice(timeMatch[0].length);
        }

        const parts = question.split('|').map(p => p.trim());
        const title = parts[0];
        const options = parts.slice(1).filter(o => o.length > 0);

        if (options.length < 2) return message.reply({ embeds: [errorEmbed('Too Few Options', 'Need at least 2 options.')] });

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const desc = options.map((o, i) => `${emojis[i]} ${o}`).join('\n\n');

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: title,
                description: desc + (timeMs > 0 ? `\n\nEnds in: <t:${Math.floor((Date.now() + timeMs) / 1000)}:R>` : ''),
                footer: { text: `Poll by ${message.author.tag}` }
            })]
        });

        for (let i = 0; i < options.length; i++) await msg.react(emojis[i]);

        if (timeMs > 0) {
            setTimeout(async () => {
                try {
                    const fetched = await msg.fetch();
                    const results = options.map((o, i) => {
                        const reaction = fetched.reactions.cache.get(emojis[i]);
                        return `${emojis[i]} **${o}** — ${reaction ? reaction.count - 1 : 0} votes`;
                    });

                    await msg.edit({
                        embeds: [createEmbed({
                            color: 0x00d26a,
                            title: `Results — ${title}`,
                            description: results.join('\n'),
                            footer: { text: 'Poll ended' }
                        })]
                    });
                    await msg.reactions.removeAll();
                } catch {}
            }, timeMs);
        }
    }
};
