const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.MessageReactionRemove,
    once: false,

    async execute(reaction, user) {
        if (user.bot) return;
        if (reaction.partial) try { await reaction.fetch(); } catch { return; }

        const config = getGuildConfig(reaction.message.guild?.id);
        const rrs = config.reactionRoles || [];

        const rr = rrs.find(r => r.messageId === reaction.message.id);
        if (!rr) return;

        const roleId = rr.roleMap[reaction.emoji.name];
        if (!roleId) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            await member.roles.remove(roleId, 'Reaction role removed');
        } catch {}
    }
};
