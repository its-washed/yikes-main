const { Events } = require('discord.js');
const { logRoleCreate, logRoleDelete, logRoleUpdate } = require('../utils/logging');

module.exports = [
    {
        name: Events.GuildRoleCreate,
        once: false,
        execute(role) { logRoleCreate(role); }
    },
    {
        name: Events.GuildRoleDelete,
        once: false,
        execute(role) { logRoleDelete(role); }
    },
    {
        name: Events.GuildRoleUpdate,
        once: false,
        execute(oldRole, newRole) { logRoleUpdate(oldRole, newRole); }
    }
];
