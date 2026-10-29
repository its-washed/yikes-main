const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { needPerm, needBotPerm, jailConfig, prefix } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { run } = require('../../utils/database');

module.exports = {
    permission: "administrator",
    data: { name: 'setjail', description: 'Set up jail module', usage: ',setjail' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        if (await jailConfig(message.guild.id)) {
            return warn(message, `Jail is **already** configured\n> Use \`${prefix(message)}unsetjail\` to disable it`);
        }

        const role = await message.guild.roles.create({
            name: 'jail',
            reason: 'creating jail role'
        }).catch(() => null);
        if (!role) {
            return warn(message, 'I don\'t have permission to create roles. Please check my permissions.');
        }

        for (const channel of message.guild.channels.cache.values()) {
            if (typeof channel.permissionOverwrites === 'undefined' || !channel.permissionOverwrites) continue;
            try {
                await channel.permissionOverwrites.edit(role, { ViewChannel: false });
            } catch (err) {
                continue;
            }
        }

        const everyone = message.guild.roles.everyone;
        const text = await message.guild.channels.create({
            name: 'jail-evelina',
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: role.id, allow: ['ViewChannel'] },
                { id: everyone.id, deny: ['ViewChannel'] }
            ],
            reason: 'creating jail channel'
        }).catch(() => null);

        if (!text) {
            await role.delete().catch(() => {});
            return warn(message, 'An error occurred while configuring jail');
        }

        run('INSERT OR REPLACE INTO jail (guild_id, role_id, channel_id) VALUES (?, ?, ?)',
            message.guild.id, role.id, text.id);

        return approve(message, 'Jail successfully configured');
    }
};
