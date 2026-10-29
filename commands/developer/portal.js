const { PermissionFlagsBits } = require('discord.js');
const { deny, warn } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'portal', description: 'Send an invite to a guild.', usage: ',portal <guild id>' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const match = /^(\d{17,20})$/.exec(String(args[0] || '').trim());
        if (!match) return deny(message, 'Usage: `portal <guild id>`');
        const guild = client.guilds.cache.get(match[1]);
        if (!guild) return deny(message, `I could not find a guild for \`${match[1]}\`.`);

        let invite = null;
        for (const channel of guild.channels.cache.values()) {
            if (!channel.isTextBased() || channel.isDMBased()) continue;
            const me = guild.members.me;
            if (!me || !channel.permissionsFor(me).has(PermissionFlagsBits.CreateInstantInvite)) continue;
            invite = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
            if (invite) break;
        }
        if (!invite) return deny(message, `I could not create an invite for \`${guild.name}\`.`);

        try {
            await message.author.send({
                content: `${invite.url || invite}`,
                embeds: [{ color: COLORS.NEUTRAL, description: `> The invite for \`${guild.name}\` is listed below:` }]
            });
        } catch (err) {
            return warn(message, 'I could not DM you the invite. Check your privacy settings.');
        }
        await message.delete().catch(() => {});
    }
};
