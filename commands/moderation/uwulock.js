const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');
const { isDeveloper } = require('../../utils/developer');

const TTL = 900 * 1000;
const uwuifyer = new Map();

function cacheKey(guildId, memberId) {
    return `uwuifyer_${guildId}_${memberId}`;
}

function isUwuified(guildId, memberId) {
    const entry = uwuifyer.get(cacheKey(guildId, memberId));
    if (!entry) return false;
    if (entry.expires <= Date.now()) {
        uwuifyer.delete(cacheKey(guildId, memberId));
        return false;
    }
    return true;
}

module.exports = {
    permission: "donator",
    data: { name: 'uwulock', description: "Uwuify messages of a specific user", usage: ',uwulock its_washed', params: ['member'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return warn(message, "I don't have **Manage Webhooks** permission in this server");
        }

        const member = message.mentions.members.first();
        if (!member) return warn(message, 'You must mention a member\n> Usage: `uwulock its_washed`');
        if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return warn(message, 'You need **Manage Webhooks** permission to use this command');
        }

        const key = cacheKey(message.guild.id, member.id);
        if (!isDeveloper(member.id)) {
            if (isUwuified(message.guild.id, member.id)) {
                uwuifyer.delete(key);
                return approve(message, `Messages of **${member}** will **no longer** be uwuified.`);
            }
            uwuifyer.set(key, { expires: Date.now() + TTL });
            return approve(message, `Messages of **${member}** will now be uwuified for **15 minutes**`);
        }
        return warn(message, 'You cannot uwulock the owner of the bot');
    },

    isUwuified
};
