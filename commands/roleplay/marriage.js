const { resolveMember, getMarriage, marriagePartner, certificateImage, dateLine } = require('../../utils/roleplay');
const { createEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

const MARRY_COLOR = 0xFF819F;

module.exports = {
    data: { name: 'marriage', description: 'View your marriage or from a given user', usage: ',marriage [user]' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        let target = message.author;
        if (args[0]) {
            target = await resolveMember(message, args[0]);
            if (!target) {
                return warn(message, `No user called **${args[0]}** found`);
            }
        }

        const row = getMarriage(target.id);
        if (!row) {
            return warn(message, target.id === message.author.id ? 'You are not **married**' : `${target} is not **married**`);
        }

        const partnerId = marriagePartner(row, target.id);
        const partner = client.users.cache.get(partnerId) || await client.users.fetch(partnerId).catch(() => null);
        if (!partner) {
            return warn(message, "Failed to retrieve the partner's information. Please try again later.");
        }

        const buffer = await certificateImage(target.username, partner.username, dateLine(row.timestamp));
        const since = new Date(Number(row.timestamp) * 1000)
            .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const payload = {
            embeds: [createEmbed({
                color: MARRY_COLOR,
                timestamp: false,
                description: `💞 ${message.author}: ${target.id === message.author.id ? 'You are' : `${target} is`} currently married to <@!${partnerId}> since **${since}**`,
                image: buffer ? { url: 'attachment://marriage.png' } : undefined
            })]
        };
        if (buffer) payload.files = [{ attachment: buffer, name: 'marriage.png' }];
        return message.reply(payload);
    }
};
