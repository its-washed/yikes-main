const { Events } = require('discord.js');
const { logVoiceStateUpdate } = require('../utils/logging');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    execute(oldState, newState) { logVoiceStateUpdate(oldState, newState); }
};
