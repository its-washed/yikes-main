const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { isDeveloper } = require('../../utils/developer');

const SPECIAL_USER = '416328937891823616';

function resolveMember(message, value) {
    if (!value) return message.member;
    const raw = String(value);
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return null;
}

module.exports = {
    data: { name: 'pp', description: 'Check pp size from yourself or a given member', usage: ',pp [member]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args) {
        const member = resolveMember(message, args[0]) || message.author;
        let a = 1;
        let b = 15;
        if (isDeveloper(member.id) || member.id === SPECIAL_USER) {
            a = 15;
            b = 30;
        }
        const size = Math.floor(Math.random() * (b - a + 1)) + a;
        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description: `${member}'s Penis\n8${'='.repeat(size)}D`
        });
        return message.reply({ embeds: [embed] });
    }
};
