const { Events } = require('discord.js');
const { logVoiceStateUpdate } = require('../utils/logging');
const { trackVCJoin, trackVCLeave } = require('../utils/activity');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    execute(oldState, newState) {
        logVoiceStateUpdate(oldState, newState);

        const guildId = oldState.guild.id;
        const userId = oldState.id;

        if (!oldState.channel && newState.channel) {
            trackVCJoin(guildId, userId);
        } else if (oldState.channel && !newState.channel) {
            trackVCLeave(guildId, userId);
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            trackVCLeave(guildId, userId);
            trackVCJoin(guildId, userId);
        }
    }
};
