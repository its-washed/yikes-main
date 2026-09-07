const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: { name: 'servers', description: 'List all servers the bot is in (Developer only)', usage: ',servers [page]' },
    aliases: ['guilds'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const guilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
        if (!guilds.size) return message.reply({ embeds: [errorEmbed('None', 'Not in any servers.')] });

        const pages = [];
        for (let i = 0; i < guilds.size; i += 10) {
            const chunk = guilds.array().slice(i, i + 10);
            pages.push({
                color: 0x6c5ce7,
                title: `Servers (${guilds.size})`,
                description: chunk.map((g, j) => `**${i + j + 1}.** ${g.name} — ${g.memberCount} members — \`${g.id}\``).join('\n')
            });
        }

        return new Paginator(pages, { userId: message.author.id }).start(message.channel);
    }
};
