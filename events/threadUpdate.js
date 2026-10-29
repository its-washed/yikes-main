const { Events } = require('discord.js');
const { first } = require('../utils/database');

module.exports = {
    name: Events.ThreadUpdate,
    once: false,

    async execute(before, after) {
        try {
            if (before.archived === after.archived) return;
            if (!after.archived) return;
            const check = first('SELECT state FROM thread_watcher WHERE guild_id = ?', after.guild.id);
            if (!check || !check.state) return;
            await after.setArchived(false, 'Thread unarchived through thread watcher').catch(() => {});
        } catch (err) {}
    }
};
