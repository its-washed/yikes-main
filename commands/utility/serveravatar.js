const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');

function findMember(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return message.member;
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return message.guild.members.cache.find((m) =>
        m.user.username.toLowerCase() === raw.toLowerCase() || m.displayName.toLowerCase() === raw.toLowerCase()) || null;
}

module.exports = {
    data: { name: 'serveravatar', description: 'Get the server avatar of a member or yourself', usage: ',serveravatar its_washed', params: ['[member]'] },
    aliases: ['sav', 'savatar'],
    cooldown: 3,

    async execute(message, args) {
        const member = args.length ? findMember(message, args.join(' ')) : message.member;
        if (!member) return warn(message, `Couldn't find a member with the name **${args.join(' ')}**`);
        const guildAvatar = member.avatarURL({ dynamic: true, size: 1024 });
        if (!guildAvatar) {
            return warn(message, `${member.id === message.author.id ? 'You don' : `${member} doesn`}t have a server avatar`);
        }
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: `${member.user.username}'s server avatar`,
                url: guildAvatar,
                image: { url: guildAvatar },
                footer: { text: `${message.author.tag} • ${message.author.id}` }
            }]
        });
    }
};
