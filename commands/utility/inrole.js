const { warn, paginate } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');

function findRole(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byId = message.guild.roles.cache.get(id);
        if (byId) return byId;
    }
    return message.guild.roles.cache.find(role => role.name.toLowerCase() === raw.toLowerCase())
        || message.guild.roles.cache.find(role => role.name.toLowerCase().startsWith(raw.toLowerCase()))
        || null;
}

module.exports = {
    data: { name: 'inrole', description: "View members in a role", usage: ',inrole admin', params: ['role'] },
    aliases: [''],
    cooldown: 10,

    async execute(message, args) {
        const role = findRole(message, args.join(' '));
        if (!role) return warn(message, 'Role not found');
        if (role.members.size > 500) return warn(message, "can't view roles with more than **500** members");
        if (!role.members.size) return warn(message, 'No members found with this role');

        const lines = role.members.map(member => `${member} (\`${member.id}\`)`);
        return paginate(message, lines, `Members with ${role.name}`, {
            name: message.guild.name,
            icon_url: message.guild.iconURL() || undefined
        }, { color: COLORS.NEUTRAL });
    }
};
