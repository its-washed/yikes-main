const { warn, confirm } = require('../../utils/context');
const { permissionDenied, successEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { EMOJIS } = require('../../utils/styles');
const { performWipe } = require('./wipe');

function resolveUser(message, args) {
    const mention = message.mentions.users.first();
    if (mention) return mention;
    const match = /^(\d{17,20})$/.exec(String(args[0] || '').trim());
    if (match) return message.client.users.cache.get(match[1]) || null;
    return null;
}

module.exports = {
    permission: "bot developer",
    data: { name: 'wipeall', description: 'Wipe all data from an user', usage: ',wipeall <user>' },
    cooldown: 0,

    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const user = resolveUser(message, args);
        if (!user) return warn(message, 'You must mention a user or provide an id');

        return confirm(message,
            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to wipe all data from ${user}?`,
            async i => {
                await performWipe(message, user, true);
                return i.update({
                    embeds: [successEmbed(null, `${message.author}: Successfully wiped all data from ${user}`)],
                    components: []
                }).catch(() => {});
            },
            async i => {
                return i.update({
                    embeds: [errorEmbed(null, `${message.author}: Wipe got canceled`)],
                    components: []
                }).catch(() => {});
            });
    }
};
