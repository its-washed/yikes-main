const { warn, paginate } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    permission: "bot developer",
    data: { name: 'checknames', description: 'Check if the bot has a custom nickname on any server', usage: ',checknames' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const serverList = [];
        for (const guild of client.guilds.cache.values()) {
            const botMember = guild.members.me;
            if (botMember && botMember.nickname) serverList.push([guild.name, botMember.nickname]);
        }
        if (!serverList.length) return warn(message, 'Der Bot verwendet auf keinem Server einen benutzerdefinierten Nickname.');
        serverList.sort((a, b) => a[0].localeCompare(b[0]));
        const lines = serverList.map(([name, nickname]) => `**${name}** - \`${nickname}\``);
        return paginate(message, lines, "evelina's nicknames", { name: message.guild.name, icon_url: message.guild.iconURL() || undefined });
    }
};
