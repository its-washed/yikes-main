const { warn, paginate } = require('../../utils/context');
const { needModerator } = require('../../utils/staff');

function permissionOf(user, guild) {
    if (user.id === guild.ownerId) return 'Owner';
    const member = guild.members.cache.get(user.id);
    if (member) {
        const permissions = member.permissions;
        if (permissions.has('Administrator')) return 'Administrator';
        if (permissions.has('BanMembers') || permissions.has('KickMembers') || permissions.has('ModerateMembers')) return 'Moderator';
    }
    return 'Member';
}

module.exports = {
    permission: "bot moderator",
    data: { name: 'mutuals', description: 'Returns mutual servers between the member and the bot with their permissions', usage: ',mutuals <user>' },
    aliases: [],
    cooldown: 5,

    execute: async (message, args, client) => {
        if (!await needModerator(message)) return;
        const user = message.mentions.users.first() || await client.users.fetch(String(args[0] || '').replace(/[<@!>]/g, '')).catch(() => null);
        if (!user) return warn(message, 'Usage: `mutuals <user>`');
        const guilds = client.guilds.cache.filter(guild => guild.members.cache.has(user.id));
        if (!guilds.size) return warn(message, `This member doesn't share any server with ${client.user.username}`);
        const lines = guilds.map(guild => `**${guild.name}** (\`${guild.id}\`) [\`${guild.memberCount.toLocaleString('en-US')}\`] - __*${permissionOf(user, guild)}*__`);
        return paginate(message, lines, 'Mutual guilds', { name: user.username, icon_url: user.displayAvatarURL({ size: 256 }) });
    }
};
