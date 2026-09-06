const { Events } = require('discord.js');
const { logChannelCreate, logChannelDelete, logChannelUpdate } = require('../utils/logging');

module.exports = [
    {
        name: Events.ChannelCreate,
        once: false,
        execute(channel) { logChannelCreate(channel); }
    },
    {
        name: Events.ChannelDelete,
        once: false,
        execute(channel) { logChannelDelete(channel); }
    },
    {
        name: Events.ChannelUpdate,
        once: false,
        execute(oldChannel, newChannel) { logChannelUpdate(oldChannel, newChannel); }
    }
];
