const { Events } = require('discord.js');

const SUPPORT_GUILD = '1228371886690537624';
const SUPPORT_CATEGORY = '1353007247105720320';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: Events.ThreadCreate,
    once: false,

    async execute(thread) {
        try {
            if (String(thread.guild.id) !== SUPPORT_GUILD) return;
            if (String(thread.parentId) !== SUPPORT_CATEGORY) return;

            let parent = thread.parent;
            if (!parent) parent = await thread.guild.channels.fetch(thread.parentId).catch(() => null);
            if (!parent) return;

            if ((thread.name || '').length < 4) {
                const resolvedTag = (parent.availableTags || []).find(tag => tag.name.toLowerCase() === 'resolved');
                if (!resolvedTag) return;
                const appliedTags = [...(thread.appliedTags || [])];
                if (!appliedTags.includes(resolvedTag.id)) appliedTags.push(resolvedTag.id);
                await thread.setLocked(true).catch(() => {});
                await thread.setAppliedTags(appliedTags).catch(() => {});
                await thread.send(`<@${thread.ownerId}>, this thread has been automatically closed due to a potentially low quality title. Your title should be descriptive of the problem you are having.\n\nPlease remake your thread with a new and more descriptive title.`).catch(() => {});
                return;
            }

            for (let attempt = 0; attempt < 10; attempt++) {
                try {
                    await thread.send(`Thanks <@${thread.ownerId}> for creating a thread. Please describe your issue in detail and a <@&1242836137853190196> or <@&1237896149822603274> will assist you shortly.`);
                    break;
                } catch (err) {
                    await sleep(1000);
                }
            }
        } catch (err) {}
    }
};
