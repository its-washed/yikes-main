const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, prefix, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first } = require('../../utils/database');

function currentChannel(message, args, index) {
    if (!args[index]) return message.channel;
    const id = String(args[index]).replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    const name = String(args[index]).toLowerCase();
    const matches = message.guild.channels.cache.filter(entry => entry.name.toLowerCase() === name);
    if (matches.size === 1) return matches.first();
    return null;
}

module.exports = {
    permission: "moderate members",
    data: { name: 'runmute', description: 'Unmute a member from reacting to messages', usage: ',runmute <member> [channel|all]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        const member = await noStaff(message, args[0], 'runmute');
        if (!member) return;

        if (args[1] && args[1].toLowerCase() === 'all') {
            const row = first('SELECT channel_id AS role_id FROM mute_reactions WHERE guild_id = ?', message.guild.id);
            if (!row) {
                return warn(message, `Mute module is **not** configured\n> Use \`${prefix(message)}setmute\` to set it up`);
            }
            const role = message.guild.roles.cache.get(String(row.role_id));
            if (!role) {
                return warn(message, `Mute role not found, please use \`${prefix(message)}unsetmute\` and set it back`);
            }
            if (!member.roles.cache.has(role.id)) {
                return warn(message, `${member} is **not** reaction muted`);
            }
            await member.roles.remove(role, `Reaction unmuted by ${message.author}`).catch(() => {});
            return approve(message, `Reaction unmuted ${member} in **all** channels`);
        }

        const channel = currentChannel(message, args, 1);
        if (!channel) return warn(message, `No channel named \`${args[1]}\` found`);

        const overwrite = channel.permissionOverwrites.cache.get(member.id);
        if (!overwrite || !overwrite.deny.has(PermissionFlagsBits.AddReactions)) {
            return warn(message, `${member} is **not** reaction muted in ${channel}`);
        }

        await channel.permissionOverwrites.edit(member, { AddReactions: null }, { reason: `Reaction unmuted by ${message.author}` }).catch(() => {});
        return approve(message, `Reaction unmuted ${member} in ${channel}`);
    }
};
