const { Events } = require('discord.js');
const { logMessageDelete, logMessageUpdate } = require('../utils/logging');

module.exports = [
    {
        name: Events.MessageDelete,
        once: false,
        execute(message) { logMessageDelete(message); }
    },
    {
        name: Events.MessageUpdate,
        once: false,
        execute(oldMessage, newMessage) { logMessageUpdate(oldMessage, newMessage); }
    }
];
