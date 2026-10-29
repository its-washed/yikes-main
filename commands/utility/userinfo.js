const { createEmbed, COLORS } = require('../../utils/embeds');
const { EMOJIS } = require('../../utils/styles');

function getBadges(user) {
    const badges = [];
    const names = user.flags ? (user.flags.toArray ? user.flags.toArray() : []) : [];
    const map = {
        Staff: EMOJIS.STAFF,
        Partner: EMOJIS.PARTNER,
        CertifiedModerator: EMOJIS.MOD,
        HypeSquad: EMOJIS.HYPESQUAD,
        HypeSquadBravery: EMOJIS.BRAVERY,
        HypeSquadBrilliance: EMOJIS.BRILLIANCE,
        HypeSquadBalance: EMOJIS.BALANCE,
        BugHunterLevel1: EMOJIS.BUGHUNTER1,
        BugHunterLevel2: EMOJIS.BUGHUNTER2,
        ActiveDeveloper: EMOJIS.ACTIVEDEVELOPER,
        VerifiedBotDeveloper: EMOJIS.BOTDEV,
        EarlyVerifiedBotDeveloper: EMOJIS.BOTDEV,
        EarlySupporter: EMOJIS.EARLYSUPPORTER
    };
    for (const flag of names) {
        if (map[flag]) badges.push(map[flag]);
    }
    if (user.avatar && String(user.avatar).startsWith('a_')) badges.push(EMOJIS.NITRO);
    return badges.join(' ');
}

function mutualGuilds(client, userId) {
    let count = 0;
    for (const guild of client.guilds.cache.values()) {
        if (guild.members.cache.has(userId)) count++;
    }
    return count;
}

module.exports = {
    data: { name: 'userinfo', description: 'View information about a member or yourself', usage: ',userinfo [member]' },
    aliases: ['user', 'ui', 'whois'],
    cooldown: 3,
    async execute(message, args, client) {
        const target = message.mentions.users.first() ||
            (args[0] && /^\d{17,20}$/.test(String(args[0]).replace(/[<@!>]/g, '')) ? await client.users.fetch(String(args[0]).replace(/[<@!>]/g, '')).catch(() => null) : null) ||
            message.author;

        let member = message.guild.members.cache.get(target.id) || null;
        if (!member) member = await message.guild.members.fetch(target.id).catch(() => null);

        const avatar = target.displayAvatarURL({ size: 512 });
        let description = '';
        const badges = getBadges(target);
        if (badges) description += `### ${badges}\n`;

        if (member && member.presence && member.activities && member.activities.length) {
            const activity = member.activities[0];
            const state = activity.state ? activity.state : 'N/A';
            description += `${EMOJIS.INFO} ${activity.name} (\`${state}\`)\n`;
        }

        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description,
            author: { name: `${target.username} (${target.id})`, icon_url: avatar },
            thumbnail: { url: avatar },
            fields: [
                {
                    name: 'Created',
                    value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>\n<t:${Math.floor(target.createdTimestamp / 1000)}:R>`
                }
            ]
        });

        const mutual = mutualGuilds(client, target.id);
        if (member) {
            const sorted = [...message.guild.members.cache.values()]
                .filter(m => m.joinedTimestamp)
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            const joinPos = sorted.findIndex(m => m.id === member.id) + 1;
            embed.footer = { text: `Join position: ${joinPos.toLocaleString('en-US')} • ${mutual.toLocaleString('en-US')} server(s)` };
            embed.fields.push({
                name: 'Joined',
                value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            });
            if (member.premiumSince) {
                embed.fields.push({
                    name: 'Boosted',
                    value: `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:D>\n<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`
                });
            }
            const roles = member.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.comparePositionTo(a)).map(r => r);
            if (roles.length > 0) {
                const shown = roles.length < 5 ? roles : roles.slice(0, 4);
                const value = shown.map(r => r.toString()).join(' ') +
                    (roles.length < 5 ? '' : ` ... and ${roles.length - 4} more`);
                embed.fields.push({ name: `Roles [${roles.length}]`, value: value.slice(0, 1024), inline: false });
            }
        } else {
            embed.footer = { text: `${mutual.toLocaleString('en-US')} server(s)` };
        }

        return message.reply({ embeds: [embed] });
    }
};
