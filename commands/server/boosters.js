const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');
const { run } = require('../../utils/database');

function saveBoosterRole(guildId, roleId) {
    run('INSERT OR REPLACE INTO booster_setting (guild_id, boost_role) VALUES (?, ?)', guildId, roleId);
}

module.exports = {
    data: {
        name: 'boosters',
        description: "View all recent server boosters",
        usage: ',boosters'
    },
    aliases: [],
    cooldown: 10,

    async execute(message) {
        const boosters = message.guild.members.cache.filter(m => m.premiumSince);

        if (boosters.size === 0) {
            return warn(message, 'This server has no boosters');
        }

        const list = boosters.map(m => {
            const duration = Math.floor((Date.now() - m.premiumSinceTimestamp) / 86400000);
            return `${m.user.tag} — **${duration}** day(s)`;
        }).join('\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0x729bb0,
                title: `Server Boosters (${boosters.size})`,
                description: list
            })]
        });
    }
};

module.exports.saveBoosterRole = saveBoosterRole;
