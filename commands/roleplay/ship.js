const { resolveMember, progressBar, shipImage } = require('../../utils/roleplay');
const { createEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

const SHIP_COLOR = 0xFF819F;

module.exports = {
    data: { name: 'ship', description: 'Check the ship rate between you and a member', usage: ',ship <member> [partner]' },
    aliases: [],
    cooldown: 5,

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
            return warn(message, "You can't ship the same person twice");
        }
        if (member.id === message.author.id && partner && partner.id === message.author.id) {
            return warn(message, "You can't ship yourself with yourself");
        }
        if (!partner) {
            if (member.id === message.author.id) {
                return warn(message, "You can't ship yourself");
            }
            partner = message.member;
        }

        const percent = Math.floor(Math.random() * 100);
        const bar = progressBar(percent);
        const buffer = await shipImage(
            member.user.displayAvatarURL({ extension: 'png', size: 128 }),
            partner.user.displayAvatarURL({ extension: 'png', size: 128 }),
            percent
        );

        const payload = {
            embeds: [createEmbed({
                color: SHIP_COLOR,
                timestamp: false,
                description: `**${member.user.username}** 💞 **${partner.user.username}**\n**${percent}%** ${bar}`,
                image: buffer ? { url: 'attachment://ship.png' } : undefined
            })]
        };
        if (buffer) payload.files = [{ attachment: buffer, name: 'ship.png' }];
        return message.reply(payload);
    }
};
