const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { first, run } = require('../../utils/database');

function resolveUser(message, args) {
    const mention = message.mentions.users.first();
    if (mention) return { user: mention, rest: args.slice(1) };
    const match = /^(\d{17,20})$/.exec(String(args[0] || '').trim());
    if (match) {
        const user = message.client.users.cache.get(match[1]);
        if (user) return { user, rest: args.slice(1) };
    }
    return { user: null, rest: args };
}

module.exports = {
    permission: "bot developer",
    data: { name: 'globalban', description: 'Ban an user globally', usage: ',globalban <user> [reason]' },
    aliases: ['gban'],
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const { user, rest } = resolveUser(message, args);
        if (!user) return warn(message, 'You must mention a user or provide an id');
        const reason = rest.join(' ').trim() || 'Globally banned by a bot owner';

        if (isDeveloper(user.id)) return warn(message, 'Do not global ban a bot owner, retard');

        const check = first('SELECT 1 AS ok FROM globalban WHERE user_id = ?', user.id);
        if (check) {
            run('DELETE FROM globalban WHERE user_id = ?', user.id);
            return approve(message, `${user} was succesfully globally unbanned`);
        }

        const targets = [];
        let mutualGuilds = 0;
        for (const guild of client.guilds.cache.values()) {
            const member = guild.members.cache.get(user.id);
            if (!member) continue;
            mutualGuilds++;
            const me = guild.members.me;
            if (!me || !me.permissions.has(PermissionFlagsBits.BanMembers)) continue;
            if (guild.ownerId === user.id) continue;
            if (me.roles.highest.comparePositions(member.roles.highest) <= 0) continue;
            targets.push(guild);
        }

        let banned = 0;
        await Promise.all(targets.map(guild =>
            guild.members.ban(user.id, { reason }).then(() => { banned++; }).catch(() => {})
        ));
        run('INSERT INTO globalban (user_id, reason) VALUES (?, ?)', user.id, reason);
        return approve(message, `${user} was succesfully global banned in ${banned}/${mutualGuilds} servers`);
    }
};
