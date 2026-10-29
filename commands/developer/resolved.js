const { warn, approve } = require('../../utils/context');

const SUPPORT_GUILD = '1228371886690537624';
const SUPPORT_CATEGORY = '1353007247105720320';
const SUPPORT_ROLES = ['1242836137853190196', '1237896149822603274'];

module.exports = {
    data: { name: 'resolved', description: 'Mark a thread as resolved', usage: ',resolved' },
    cooldown: 3,

    async execute(message) {
        const thread = message.channel;
        if (!thread.isThread || !thread.isThread()) {
            return warn(message, 'This command can only be used in a thread');
        }
        if (String(message.guild.id) !== SUPPORT_GUILD) {
            return warn(message, 'This command can only be used in the support server');
        }

        let parent = thread.parent;
        if (!parent && thread.parentId) {
            parent = await message.guild.channels.fetch(thread.parentId).catch(() => null);
        }
        if (!parent || String(parent.id) !== SUPPORT_CATEGORY) {
            return warn(message, 'This command can only be used in the support category');
        }

        const authorRoles = message.member ? message.member.roles.cache.map(role => role.id) : [];
        const isOwner = thread.ownerId === message.author.id;
        const hasRole = SUPPORT_ROLES.some(id => authorRoles.includes(id));
        if (!isOwner && !hasRole) {
            return warn(message, 'You must be the owner of this thread or have the <@&1242836137853190196>/<@&1237896149822603274> role to mark this thread as resolved');
        }

        const availableTags = parent.availableTags || [];
        const resolvedTag = availableTags.find(tag => tag.name.toLowerCase() === 'resolved');
        if (!resolvedTag) return warn(message, 'The `resolved` tag is not available in this category');

        const appliedTags = [...(thread.appliedTags || [])];
        if (!appliedTags.includes(resolvedTag.id)) appliedTags.push(resolvedTag.id);

        await thread.setLocked(true).catch(() => {});
        await thread.setAppliedTags(appliedTags).catch(() => {});
        return approve(message, 'This thread has been marked as resolved');
    }
};
