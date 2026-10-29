const { paginate, warn } = require('../../utils/context');
const { isDeveloper } = require('../../utils/developer');
const { permissionDenied } = require('../../utils/embeds');

module.exports = {
    permission: "bot developer",
    data: { name: 'guilds', description: 'All guilds the bot is in, sorted from the biggest to the smallest', usage: ',guilds' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) {
            return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
        }
        const servers = [...client.guilds.cache.values()]
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 500);
        const lines = servers.map(g =>
            `${g.name} \`(${g.id})\` \`${g.ownerId ? (g.members.cache.get(g.ownerId)?.user.tag || g.ownerId) : 'unknown'}\` \`\`(${g.ownerId})\`\` - ${Number(g.memberCount).toLocaleString('en-US')} members`
        );
        return paginate(message, lines, `${client.user.username}'s servers`);
    }
};
