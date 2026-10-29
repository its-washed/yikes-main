const { Events } = require('discord.js');
const { first } = require('../utils/database');

module.exports = {
    name: Events.GuildBanRemove,
    once: false,

    async execute(ban) {
        try {
            const guild = ban.guild;
            if (!guild) return;
            const check = first('SELECT * FROM hardban WHERE guild_id = ? AND user_id = ?', guild.id, ban.user.id);
            if (!check) return;
            const moderator = guild.client.users.cache.get(String(check.moderator_id));
            const reason = moderator
                ? `Hardbanned by ${moderator.username} (${check.moderator_id}): ${check.reason}`
                : `Hardbanned: ${check.reason}`;
            await guild.bans.create(ban.user, { reason }).catch(() => {});
        } catch (err) {}
    }
};
