const { warn } = require('../../utils/context');
const { EMOJIS } = require('../../utils/styles');
const { confirm } = require('../../utils/moderation');
const { query, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'clearownerhistory', description: 'Reset the owner history of a guild', usage: ',clearownerhistory' },
    aliases: ['clearowner'],
    cooldown: 3,

    async execute(message) {
        const check = query('SELECT 1 AS ok FROM owner_history WHERE guild_id = ?', message.guild.id);
        if (!check.length) return warn(message, 'There is no owner history saved for this server');
        return confirm(message,
            `${EMOJIS.QUESTION} ${message.guild.name}: Are you sure you want to **clear** the owner history?`,
            async (i) => {
                run('DELETE FROM owner_history WHERE guild_id = ?', i.guild.id);
                return i.update({
                    embeds: [successEmbed(null, `${EMOJIS.APPROVE} ${i.guild.name}: Cleared the owner history`)],
                    components: []
                }).catch(() => {});
            },
            async (i) => {
                return i.update({
                    embeds: [errorEmbed(null, `${EMOJIS.DENY} ${i.guild.name}: Owner history deletion got canceled`)],
                    components: []
                }).catch(() => {});
            });
    }
};
