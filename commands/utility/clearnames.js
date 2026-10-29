const { warn, approve } = require('../../utils/context');
const { EMOJIS } = require('../../utils/styles');
const { confirm } = require('../../utils/moderation');
const { query, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'clearnames', description: 'Reset your name history', usage: ',clearnames' },
    aliases: ['cnames'],
    cooldown: 3,

    async execute(message) {
        const usernameCheck = query('SELECT 1 AS ok FROM usernames WHERE user_id = ?', message.author.id);
        const nicknameCheck = query('SELECT 1 AS ok FROM nicknames WHERE user_id = ?', message.author.id);
        if (!usernameCheck.length && !nicknameCheck.length) {
            return warn(message, 'There are no usernames or nicknames saved for you');
        }
        return confirm(message,
            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **clear** your username and nickname history?`,
            async (i) => {
                run('DELETE FROM usernames WHERE user_id = ?', i.user.id);
                run('DELETE FROM nicknames WHERE user_id = ?', i.user.id);
                return i.update({
                    embeds: [successEmbed(null, `${EMOJIS.APPROVE} ${i.user}: Cleared your username and nickname history`)],
                    components: []
                }).catch(() => {});
            },
            async (i) => {
                return i.update({
                    embeds: [errorEmbed(null, `${EMOJIS.DENY} ${i.user}: Username and nickname history deletion got canceled`)],
                    components: []
                }).catch(() => {});
            });
    }
};
