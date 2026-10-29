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
    data: { name: 'imute', description: 'Mute a member from sending images', usage: ',imute <member> [channel|all]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        const member = await noStaff(message, args[0], 'imute');
        if (!member) return;

        if (args[1] && args[1].toLowerCase() === 'all') {
            const row = first('SELECT channel_id AS role_id FROM mute_images WHERE guild_id = ?', message.guild.id);
            if (!row) {
                return warn(message, `Mute module is **not** configured\n> Use \`${prefix(message)}setmute\` to set it up`);
            }
            const role = message.guild.roles.cache.get(String(row.role_id));
            if (!role) {
                return warn(message, `Mute role not found, please use \`${prefix(message)}unsetmute\` and set it back`);
            }
            if (role.position >= message.guild.members.me.roles.highest.position) {
                return warn(message, 'Mute role is over my highest role');
            }
            if (member.roles.cache.has(role.id)) {
                return warn(message, `${member} is **already** image muted`);
            }
            await member.roles.add(role, `Image muted by ${message.author}`).catch(() => {});
            return approve(message, `Image muted ${member} in **all** channels`);
        }

        const channel = currentChannel(message, args, 1);
        if (!channel) return warn(message, `No channel named \`${args[1]}\` found`);

        const overwrite = channel.permissionOverwrites.cache.get(member.id);
        if (overwrite && overwrite.deny.has(PermissionFlagsBits.AttachFiles)) {
            return warn(message, `${member} is **already** image muted in ${channel}`);
        }

        await channel.permissionOverwrites.edit(member, { AttachFiles: false, EmbedLinks: false }, { reason: `Image muted by ${message.author}` }).catch(() => {});
        return approve(message, `Image muted ${member} in ${channel}`);
    }
};
