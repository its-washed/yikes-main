const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first, run } = require('../../utils/database');

module.exports = {
    permission: "manage roles",
    data: { name: 'restore', description: 'Give a member their roles back after rejoining', usage: ',restore <member>' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        const member = await noStaff(message, args[0], 'restore');
        if (!member) return;

        const check = first('SELECT roles FROM restore WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
        if (!check) return warn(message, 'This member doesn\'t have any roles saved.');

        let saved = [];
        try { saved = JSON.parse(check.roles) || []; } catch (err) { saved = []; }

        const me = message.guild.members.me;
        const authorMember = message.member || message.guild.members.cache.get(message.author.id);
        const authorTop = authorMember && authorMember.roles ? authorMember.roles.highest.position : 0;
        const assignable = saved
            .map(id => message.guild.roles.cache.get(String(id)))
            .filter(r => r && !r.managed && r.id !== message.guild.id && r.position < authorTop && r.position < me.roles.highest.position);

        if (!assignable.length) {
            return warn(message, 'No assignable roles were found to restore. Make sure your role hierarchy allows this.');
        }

        const restored = [];
        for (const role of assignable) {
            try {
                await member.addRoles(role, `Dangerous roles restored by ${message.author}`);
                restored.push(`${role}`);
            } catch (err) {
                return warn(message, `I don't have permission to assign the role: ${role}`);
            }
        }

        if (restored.length) {
            let description = `Successfully restored the following roles for ${member}: ${restored.join(', ')}.`;
            if (description.length > 4096) description = description.slice(0, 4093) + '...';
            await approve(message, description);
        } else {
            await warn(message, 'No roles were restored due to permission issues or hierarchy conflicts');
        }

        try {
            run('DELETE FROM restore WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
        } catch (err) {
            return warn(message, 'Roles were restored, but an error occurred while cleaning up the database');
        }
        return null;
    }
};
