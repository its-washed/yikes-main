const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, prefix } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first, query, run } = require('../../utils/database');
const { createEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
    permission: "administrator",
    data: { name: 'setmute', description: 'Set up mute module', usage: ',setmute' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;

        if (first('SELECT * FROM mute_images WHERE guild_id = ?', message.guild.id) &&
            first('SELECT * FROM mute_reactions WHERE guild_id = ?', message.guild.id)) {
            return warn(message, 'Mute module is **already** configured');
        }

        const status = await message.reply({
            embeds: [createEmbed({
                color: COLORS.info,
                timestamp: false,
                description: `⏳ ${message.author}: Configuring **mute system** and creating needed **roles**`
            })]
        });

        try {
            const imageRole = await message.guild.roles.create({ name: 'imuted', reason: 'creating image mute role' });
            const reactionRole = await message.guild.roles.create({ name: 'rmuted', reason: 'creating reaction mute role' });

            run('INSERT INTO mute_images (guild_id, channel_id) VALUES (?, ?)', message.guild.id, imageRole.id);
            run('INSERT INTO mute_reactions (guild_id, channel_id) VALUES (?, ?)', message.guild.id, reactionRole.id);

            for (const channel of message.guild.channels.cache.values()) {
                if (channel.type !== 0 && channel.type !== 5) continue;
                await channel.permissionOverwrites.edit(imageRole, { AttachFiles: false, EmbedLinks: false }, { reason: 'Image muted role setup' }).catch(() => {});
                await channel.permissionOverwrites.edit(reactionRole, { AddReactions: false }, { reason: 'Reaction muted role setup' }).catch(() => {});
            }

            return status.edit({
                embeds: [createEmbed({
                    color: COLORS.success,
                    timestamp: false,
                    description: `✅ ${message.author}: Mute system has been **configured**`
                })]
            });
        } catch (err) {
            return status.edit({
                embeds: [createEmbed({
                    color: COLORS.error,
                    timestamp: false,
                    description: `❌ ${message.author}: An error occurred while configuring the mute system`
                })]
            });
        }
    }
};
