const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, jailConfig, requireJail, invokeDm, invokeMessage, insertCase, sendModLog, splitReason } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first, run } = require('../../utils/database');
const { resolveMember } = require('../../utils/roleplay');

module.exports = {
    permission: "manage messages",
    data: { name: 'unjail', description: 'Lift the jail restriction from a member', usage: ',unjail its_washed rassist --s', params: ['member', '[reason]'], flags: { s: 'Punish a user silently' } },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await requireJail(message)) return;

        const member = await resolveMember(message, args[0]);
        if (!member) return warn(message, `Member **${args[0] || ''}** couldn't be found`);

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;
        const silent = parsed.silent;

        const jailed = first('SELECT roles FROM jail_members WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
        if (!jailed) return warn(message, `${member} is **not** jailed`);

        const check = await jailConfig(message.guild.id);
        const jailRole = message.guild.roles.cache.get(String(check.role_id));
        if (!jailRole) return warn(message, 'Jail role **not found**. Please unset jail and set it back');

        const me = message.guild.members.me;
        if (me.roles.highest.position <= jailRole.position) {
            return warn(message, `Role **${jailRole}** is over my highest role`);
        }

        let saved = [];
        try { saved = JSON.parse(jailed.roles) || []; } catch (err) { saved = []; }

        const roles = saved
            .map(id => message.guild.roles.cache.get(String(id)))
            .filter(r => r && r.position < me.roles.highest.position);
        const booster = message.guild.roles.premiumSubscriberRole;
        if (booster && member.roles.cache.has(booster.id)) roles.push(booster);

        await member.edit({ roles, reason }).catch(() => {});

        if (!silent) {
            const sent = await invokeDm(member, message.guild.id, 'unjail', { reason }).catch(() => false);
            if (!sent) {
                await member.send({
                    embeds: [{
                        color: 0x39ffb8,
                        description: `You have been unjailed on **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`
                    }]
                }).catch(() => {});
            }
        }

        run('DELETE FROM jail_members WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);

        const historyId = insertCase(message, member, 'Unjail', 'None', reason, Date.now() / 1000);

        await sendModLog(message.guild, {
            user: member,
            moderator: message.author,
            reason,
            description: 'unjailed',
            punishment: 'Unjail',
            historyId
        });

        const invoked = await invokeMessage(message, 'unjail', member, { reason, historyId }).catch(() => false);
        if (!invoked) {
            return approve(message, `Unjailed ${member} (\`#${historyId}\`) - ${reason}`);
        }
        return null;
    }
};
