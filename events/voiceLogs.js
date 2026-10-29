const { Events } = require('discord.js');
const { logVoiceStateUpdate } = require('../utils/logging');
const { trackVCJoin, trackVCLeave, getUserActivity } = require('../utils/activity');
const { run, first } = require('../utils/database');

function trackVoiceSeconds(guildId, userId, channelId, seconds) {
    if (seconds <= 0) return;
    try {
        if (first('SELECT 1 AS ok FROM activity_ignore WHERE guild_id = ? AND channel_id = ?', guildId, channelId)) return;
    } catch (err) { return; }
    try {
        const today = new Date().toISOString().slice(0, 10);
        run('INSERT INTO activity_voice (user_id, channel_id, server_id, voice_date, voice_time) VALUES (?, ?, ?, ?, ?) ' +
            'ON CONFLICT (user_id, server_id, voice_date) DO UPDATE SET voice_time = voice_time + excluded.voice_time, channel_id = excluded.channel_id',
            userId, channelId, guildId, today, seconds);
    } catch (err) {}
}

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
            const before = getUserActivity(guildId, userId);
            const joined = before.lastVCJoin || 0;
            trackVCLeave(guildId, userId);
            if (joined > 0) trackVoiceSeconds(guildId, userId, oldState.channel.id, (Date.now() - joined) / 1000);
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            const before = getUserActivity(guildId, userId);
            const joined = before.lastVCJoin || 0;
            trackVCLeave(guildId, userId);
            if (joined > 0) trackVoiceSeconds(guildId, userId, oldState.channel.id, (Date.now() - joined) / 1000);
            trackVCJoin(guildId, userId);
        }
    }
};
