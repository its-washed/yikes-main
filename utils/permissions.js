const { isDeveloper } = require('./developer');

function hasPermission(member, permission) {
    if (isDeveloper(member.id)) return true;
    return member.permissions.has(permission);
}

function isAdmin(member) {
    if (isDeveloper(member.id)) return true;
    return member.permissions.has('Administrator');
}

function isOwner(member) {
    if (isDeveloper(member.id)) return true;
    return member.id === member.guild.ownerId;
}

module.exports = { hasPermission, isAdmin, isOwner };
