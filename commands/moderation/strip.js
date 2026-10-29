const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { warn, approve } = require('../../utils/context');
const { run, first } = require('../../utils/database');

const DANGEROUS = [
    'BanMembers',
    'KickMembers',
    'MentionEveryone',
    'ManageChannels',
    'ManageEvents',
    'ManageGuildExpressions',
    'ManageGuild',
    'ManageRoles',
    'ManageMessages',
    'ManageWebhooks',
    'ManageGuildPermissions',
    'ManageThreads',
    'ModerateMembers',
    'Administrator'
];

function isDangerous(role) {
    return DANGEROUS.some(flag => role.permissions.has(flag));
}

module.exports = {
    permission: "manage roles",
    data: { name: 'strip', description: "Remove someone's dangerous roles, ignoring bot-managed roles", usage: ',strip <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!args.length) return warn(message, 'Usage: `strip <member>`');

        const member = await noStaff(message, args[0], 'strip');
        if (!member) return;

        const me = message.guild.members.me;
        const botTop = me ? me.roles.highest.position : 0;
        let targets = [];

        const antinuke = first('SELECT staffs FROM antinuke WHERE guild_id = ?', message.guild.id);
        if (antinuke && antinuke.staffs) {
            try {
                const staffIds = JSON.parse(antinuke.staffs);
                if (Array.isArray(staffIds) && staffIds.length) {
                    const ids = staffIds.map(String);
                    targets = [...member.roles.cache.filter(role =>
                        ids.includes(String(role.id)) && !role.managed && role.position < botTop).values()];
                }
            } catch (err) {
                targets = [];
            }
        }

        if (!targets.length) {
            targets = [...member.roles.cache.filter(role =>
                !role.managed &&
                role.id !== message.guild.roles.everyone.id &&
                role.position < botTop &&
                isDangerous(role)).values()];
        }

        if (!targets.length) return warn(message, `No dangerous roles found to strip from ${member}.`);

        run('INSERT INTO restore_antinuke (guild_id, user_id, roles) VALUES (?, ?, ?) ON CONFLICT (guild_id, user_id) DO UPDATE SET roles = excluded.roles',
            message.guild.id, member.id, JSON.stringify(targets.map(role => role.id)));

        const removed = [];
        const failed = [];
        for (const role of targets) {
            try {
                await member.roles.remove(role, `Stripped by ${message.author}`);
                removed.push(role);
            } catch (err) {
                failed.push(role);
            }
        }

        let text = removed.length
            ? `Successfully stripped the following roles from ${member}: ${removed.join(', ')}.`
            : `No roles were successfully stripped from ${member}.`;
        if (failed.length) text += `\nFailed to remove the following roles: ${failed.join(', ')}.`;
        return approve(message, text);
    }
};
