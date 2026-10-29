const { warn } = require('../../utils/context');
const { EMOJIS } = require('../../utils/styles');
const { confirm } = require('../../utils/moderation');
const { query, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'clearguildnames', description: 'Reset guild name history', usage: ',clearguildnames' },
    aliases: ['cleargnames'],
    cooldown: 3,

    async execute(message) {
        const check = query('SELECT 1 AS ok FROM guildnames WHERE guild_id = ?', message.guild.id);
        if (!check.length) return warn(message, 'There are no guildnames saved for this server');
        return confirm(message,
            `${EMOJIS.QUESTION} ${message.guild.name}: Are you sure you want to **clear** the guildname history?`,
            async (i) => {
                run('DELETE FROM guildnames WHERE guild_id = ?', i.guild.id);
                return i.update({
                    embeds: [successEmbed(null, `${EMOJIS.APPROVE} ${i.guild.name}: Cleared the guildname history`)],
                    components: []
                }).catch(() => {});
            },
            async (i) => {
                return i.update({
                    embeds: [errorEmbed(null, `${EMOJIS.DENY} ${i.guild.name}: Guildname history deletion got canceled`)],
                    components: []
                }).catch(() => {});
            });
    }
};
