const { warn } = require('../../utils/context');
const { AttachmentBuilder } = require('discord.js');

function resolveMember(message, value) {
    if (!value) return null;
    const raw = String(value);
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return null;
}

module.exports = {
    data: { name: 'tweet', description: 'Create a tweet', usage: ',tweet [member] <comment>' },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        if (!args.length) return warn(message, 'You must provide a comment\n> Usage: `tweet [member] <comment>`');

        let user = message.author;
        let parts = [...args];
        const target = resolveMember(message, args[0]);
        if (target) {
            user = target;
            parts = args.slice(1);
        }
        const comment = parts.join(' ').trim();
        if (!comment) return warn(message, 'You must provide a comment\n> Usage: `tweet [member] <comment>`');

        const url = new URL('https://some-random-api.com/canvas/misc/tweet');
        url.searchParams.set('username', user.username);
        url.searchParams.set('displayname', user.displayName);
        url.searchParams.set('avatar', user.displayAvatarURL({ size: 256 }));
        url.searchParams.set('comment', comment);

        let bytes = null;
        try {
            const res = await fetch(url.toString());
            if (res.ok) bytes = Buffer.from(await res.arrayBuffer());
        } catch (err) {
            bytes = null;
        }
        if (!bytes) return warn(message, 'Failed to create tweet image');
        return message.reply({ files: [new AttachmentBuilder(bytes, { name: 'tweet.png' })] });
    }
};
