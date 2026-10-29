const { resolveMember, certificateImage, dateLine } = require('../../utils/roleplay');
const { createEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'married', description: 'Create a marriage certificate', usage: ',married <member> [partner]' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        const member = await resolveMember(message, args[0]);
        if (!member) {
            return warn(message, `Member **${args[0] || ''}** couldn't be found`);
        }

        let partner = args[1] ? await resolveMember(message, args[1]) : null;
        if (args[1] && !partner) {
            return warn(message, `Member **${args[1]}** couldn't be found`);
        }
        if (partner && partner.id === member.id) {
            return warn(message, "You can't marry the same person twice.");
        }
        if (member.id === message.author.id && partner && partner.id === message.author.id) {
            return warn(message, "You can't marry yourself with yourself.");
        }
        if (!partner) {
            if (member.id === message.author.id) {
                return warn(message, "You can't marry yourself.");
            }
            partner = message.member;
        }

        const buffer = await certificateImage(member.user.username, partner.user.username, dateLine(Date.now() / 1000));
        if (!buffer) {
            return message.reply({
                embeds: [createEmbed({
                    color: 0xFF819F,
                    timestamp: false,
                    description: `**${member.user.username}** 💞 **${partner.user.username}**`
                })]
            });
        }

        return message.reply({ files: [{ attachment: buffer, name: 'marriage.png' }] });
    }
};
