const { Events } = require('discord.js');
const { logMemberJoin, logMemberRemove } = require('../utils/logging');

module.exports = [
    {
        name: Events.GuildMemberAdd,
        once: false,
        execute(member) { logMemberJoin(member); }
    },
    {
        name: Events.GuildMemberRemove,
        once: false,
        execute(member) { logMemberRemove(member); }
    }
];
