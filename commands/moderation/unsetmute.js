const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, prefix } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first, run } = require('../../utils/database');

module.exports = {
    permission: "administrator",
    data: { name: 'unsetmute', description: 'Unset the mute module', usage: ',unsetmute' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        const imageRow = first('SELECT channel_id AS role_id FROM mute_images WHERE guild_id = ?', message.guild.id);
        const reactionRow = first('SELECT channel_id AS role_id FROM mute_reactions WHERE guild_id = ?', message.guild.id);

        if (!imageRow && !reactionRow) {
            return warn(message, `Mute module is **not** configured\n> Use \`${prefix(message)}setmute\` to set it up`);
        }

        if (imageRow) {
            const role = message.guild.roles.cache.get(String(imageRow.role_id));
            if (role) await role.delete('Unsetting mute module').catch(() => {});
        }
        if (reactionRow) {
            const role = message.guild.roles.cache.get(String(reactionRow.role_id));
            if (role) await role.delete('Unsetting mute module').catch(() => {});
        }

        run('DELETE FROM mute_images WHERE guild_id = ?', message.guild.id);
        run('DELETE FROM mute_reactions WHERE guild_id = ?', message.guild.id);

        return approve(message, 'Mute system has been **unset**');
    }
};
