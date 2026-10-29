const { warn, confirm } = require('../../utils/context');
const { permissionDenied, successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { first, run } = require('../../utils/database');
const { EMOJIS } = require('../../utils/styles');

function resolveUser(message, args) {
    const mention = message.mentions.users.first();
    if (mention) return mention;
    const match = /^(\d{17,20})$/.exec(String(args[0] || '').trim());
    if (match) return message.client.users.cache.get(match[1]) || null;
    return null;
}

async function performWipe(message, user, cards) {
    const userData = first('SELECT * FROM economy WHERE user_id = ?', user.id);
    const userLab = first('SELECT * FROM economy_lab WHERE user_id = ?', user.id);
    const userBusiness = first('SELECT * FROM economy_business WHERE user_id = ?', user.id);

    run('DELETE FROM economy WHERE user_id = ?', user.id);
    run('DELETE FROM economy_lab WHERE user_id = ?', user.id);
    run('DELETE FROM economy_business WHERE user_id = ?', user.id);
    if (cards) {
        run('DELETE FROM economy_cards_user WHERE user_id = ?', user.id);
        run('DELETE FROM economy_cards_used WHERE user_id = ?', user.id);
    }
    run('INSERT INTO economy_logs_wipe (user_id, moderator_id, cash, card, bank, lab, business, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        user.id,
        message.author.id,
        userData ? (userData.cash || 0) : 0,
        userData ? (userData.card || 0) : 0,
        userData ? (userData.item_bank || 0) : 0,
        userLab ? (userLab.upgrade_state || 0) : 0,
        userBusiness ? (userBusiness.business_id || 0) : 0,
        Date.now() / 1000);
}

module.exports = {
    permission: "bot developer",
    data: { name: 'wipe', description: "Wipe an user's data", usage: ',wipe <user>' },
    cooldown: 0,

    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const user = resolveUser(message, args);
        if (!user) return warn(message, 'You must mention a user or provide an id');

        return confirm(message,
            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to wipe ${user}?`,
            async i => {
                await performWipe(message, user, false);
                return i.update({
                    embeds: [successEmbed(null, `${message.author}: Successfully wiped ${user}`)],
                    components: []
                }).catch(() => {});
            },
            async i => {
                return i.update({
                    embeds: [errorEmbed(null, `${message.author}: Wipe got canceled`)],
                    components: []
                }).catch(() => {});
            });
    },

    performWipe
};
