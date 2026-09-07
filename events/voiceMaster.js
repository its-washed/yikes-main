const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { resolve } = require('../utils/variables');
const { logger } = require('../utils/logger');

const tempChannels = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,

    async execute(oldState, newState) {
        const member = newState.member;
        if (member.user.bot) return;
        const config = getGuildConfig(newState.guild.id);
        if (!config.voicemaster?.enabled) return;

        const jtcId = config.voicemaster.joinToCreateId;
        if (!jtcId) return;

        if (newState.channelId === jtcId && oldState.channelId !== jtcId) {
            try {
                const category = config.voicemaster.categoryId ? newState.guild.channels.cache.get(config.voicemaster.categoryId) : null;
                const channelName = resolve(config.voicemaster.name || "{user.display_name}'s VC", { member, user: member.user, guild: newState.guild });

                const channel = await newState.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: category?.id || null,
                    bitrate: config.voicemaster.bitrate || 64000,
                    userLimit: config.voicemaster.userLimit || 0,
                    permissionOverwrites: [
                        { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
                        { id: newState.guild.id, allow: [PermissionFlagsBits.Connect] }
                    ]
                });

                await newState.setChannel(channel);
                tempChannels.set(channel.id, {
                    ownerId: member.id,
                    guildId: newState.guild.id,
                    createdAt: Date.now()
                });
            } catch (err) {
                logger.error(`voicemaster err: ${err.message}`);
            }
        }

        if (tempChannels.has(oldState.channelId) && oldState.channelId !== newState.channelId) {
            const ch = oldState.guild.channels.cache.get(oldState.channelId);
            if (ch && ch.members.size === 0) {
                tempChannels.delete(oldState.channelId);
                ch.delete().catch(() => {});
            }
        }
    }
};

module.exports.tempChannels = tempChannels;
