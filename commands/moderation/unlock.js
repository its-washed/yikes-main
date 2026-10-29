const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, prefix } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { query } = require('../../utils/database');
const { sendCard } = require('../../utils/helpCard');

function resolveChannel(message, value) {
    if (!value) return message.channel;
    const id = String(value).replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const channel = message.guild.channels.cache.get(id);
        if (channel) return channel;
    }
    const name = String(value).toLowerCase();
    const matches = message.guild.channels.cache.filter(entry => entry.name.toLowerCase() === name);
    if (matches.size === 1) return matches.first();
    return null;
}

async function lockdownRoles(message) {
    const rows = query('SELECT role_id FROM lockdown_role WHERE guild_id = ?', message.guild.id);
    const roles = rows
        .map(row => message.guild.roles.cache.get(String(row.role_id)))
        .filter(Boolean);
    return { rows, roles };
}

module.exports = {
    permission: "manage roles",
    data: { name: 'unlock', description: 'Unlock a channel', usage: ',unlock #commands', params: ['[channel]'] },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        const { rows, roles } = await lockdownRoles(message);
        if (!rows.length) {
            return warn(message, `No roles in the lockdown role list\n> Use \`${prefix(message)}lockdown role add\` to add a role`);
        }
        if (!roles.length) {
            return warn(message, 'No valid roles found to unlock the channel');
        }

        if (args[0] && args[0].toLowerCase() === 'all') {
            const channelRows = query('SELECT channel_id FROM lockdown_channel WHERE guild_id = ?', message.guild.id);
            if (!channelRows.length) {
                return warn(message, `No channels in the lockdown channel list\n> Use \`${prefix(message)}lockdown channel add\` to add a channel`);
            }
            const channels = channelRows
                .map(row => message.guild.channels.cache.get(String(row.channel_id)))
                .filter(Boolean);
            if (!channels.length) {
                return warn(message, 'No valid channels found to unlock');
            }
            for (const channel of channels) {
                for (const role of roles) {
                    await channel.permissionOverwrites.edit(role, { SendMessages: true }, { reason: `Channel unlocked by ${message.author}` }).catch(() => {});
                }
            }
            return approve(message, 'Unlocked all specified channels for all specified roles');
        }

        const channel = resolveChannel(message, args[0]);
        if (!channel) {
            return warn(message, `No channel named \`${args[0]}\` found`);
        }
        if (channel.type === 11 || channel.type === 12) {
            return warn(message, `You can't unlock a thread\n> Use \`${prefix(message)}thread unlock\` instead`);
        }
        if (channel.type !== 0 && channel.type !== 5) {
            return sendCard(message, module.exports);
        }

        const alreadyUnlocked = roles.every(role => {
            const overwrite = channel.permissionOverwrites.cache.get(role.id);
            return overwrite ? overwrite.allow.has(PermissionFlagsBits.SendMessages) : false;
        });
        if (alreadyUnlocked) {
            return warn(message, 'Channel is **already** unlocked for all specified roles');
        }

        for (const role of roles) {
            await channel.permissionOverwrites.edit(role, { SendMessages: true }, { reason: `Channel unlocked by ${message.author}` }).catch(() => {});
        }

        return approve(message, `Unlocked ${channel} for all specified roles`);
    }
};
