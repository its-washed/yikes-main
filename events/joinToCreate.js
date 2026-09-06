const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,

    async execute(oldState, newState) {
        const config = getGuildConfig(newState.guild.id);
        const jtc = config.joinToCreate;
        if (!jtc?.enabled || !jtc.channel) return;

        if (newState.channelId === jtc.channel && !oldState.channelId) {
            try {
                const category = jtc.category ? newState.guild.channels.cache.get(jtc.category) : null;
                const channel = await newState.guild.channels.create({
                    name: `${newState.member.user.username}'s Channel`,
                    type: ChannelType.GuildVoice,
                    parent: category?.id || undefined,
                    permissionOverwrites: [
                        { id: newState.member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
                        { id: newState.guild.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }
                    ]
                });

                await newState.member.voice.setChannel(channel.id);

                const checkEmpty = setInterval(async () => {
                    try {
                        const ch = newState.guild.channels.cache.get(channel.id);
                        if (!ch || ch.members.size === 0) {
                            clearInterval(checkEmpty);
                            if (ch) await ch.delete().catch(() => {});
                        }
                    } catch { clearInterval(checkEmpty); }
                }, 5000);
            } catch {}
        }
    }
};
