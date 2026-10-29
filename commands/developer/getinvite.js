const { warn } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

function resolveGuild(message, args) {
    const mention = message.mentions.guilds.first() || message.mentions.channels.first();
    if (mention && mention.guild) return mention.guild;
    const token = String(args[0] || '').trim();
    const match = /(\d{17,20})/.exec(token);
    if (match) {
        return message.client.guilds.cache.get(match[1]) || null;
    }
    return null;
}

module.exports = {
    permission: "bot developer",
    data: { name: 'getinvite', description: 'Get the invite of a authorized server', usage: ',getinvite <guild>' },
    cooldown: 0,

    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const guild = resolveGuild(message, args);
        if (!guild) return warn(message, 'Could not find that guild');

        let invite = null;
        if (guild.vanityURLCode) invite = `https://discord.gg/${guild.vanityURLCode}`;
        else {
            const invites = await guild.invites.fetch().catch(() => null);
            if (invites && invites.size) invite = invites.first().url;
        }
        if (!invite) return warn(message, "This server doesn't have any available invites");
        return message.reply(invite);
    }
};
