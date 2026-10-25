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

function canAssignRole(member, role) {
    if (!member || !role) return false;
    if (member.guild && member.guild.ownerId === member.id) return true;
    const highest = member.roles && member.roles.highest;
    if (!highest) return false;
    return role.position < highest.position;
}

module.exports = { hasPermission, isAdmin, isOwner, canAssignRole };
