const { sendCard } = require('../../utils/helpCard');
const { resolveMember, isNsfw } = require('../../utils/roleplay');
const { warn, deny } = require('../../utils/context');
const { applyDescriptions } = require('../../utils/helpers');

function group(message, args, client) {
    return sendCard(message, module.exports);
}

async function scene(message, args, client, action) {
    if (!isNsfw(message)) {
        return deny(message, 'This command can only be used in **nsfw** channels');
    }
    const member = await resolveMember(message, args[0]);
    if (!member) {
        return warn(message, `Member **${args[0] || ''}** couldn't be found`);
    }
    const partner = await resolveMember(message, args[1]);
    if (!partner) {
        return warn(message, `Member **${args[1] || ''}** couldn't be found`);
    }
    if (member.id === message.author.id || partner.id === message.author.id) {
        return warn(message, "You can't threesome with yourself silly");
    }

    const { imageFor } = require('../../utils/roleplay');
    const { createEmbed, COLORS } = require('../../utils/embeds');
    const image = await imageFor(action);

    return message.reply({
        embeds: [createEmbed({
            color: COLORS.neutral,
            timestamp: false,
            description: `*Oh yeah!* **${message.author.username}** started a threesome with **${member.user.username}** & **${partner.user.username}**`,
            image: image ? { url: image } : undefined
        })]
    });
}

module.exports = {
    permission: "NSFW Channel",
    data: { name: 'threesome', description: 'Threesome commands', usage: ',threesome <fff|fmm|ffm>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['ffm', 'fmm', 'fff'],
    subUsages: {
        ffm: ',threesome ffm <member> <partner>',
        fmm: ',threesome fmm <member> <partner>',
        fff: ',threesome fff <member> <partner>'
    },
    subs: {
        fff: { execute: (message, args, client) => scene(message, args, client, 'fff') },
        ffm: { execute: (message, args, client) => scene(message, args, client, 'ffm') },
        fmm: { execute: (message, args, client) => scene(message, args, client, 'fmm') }
    },
    execute: group
};

applyDescriptions(module.exports, {
    "threesome ffm": "Threesome with two girls & one boy",
    "threesome fmm": "Threesome with one girl & two boys",
    "threesome fff": "Threesome with only girls"
});
