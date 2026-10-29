const { warn } = require('../../utils/context');
const { COLORS, ICONS } = require('../../utils/styles');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'steam',
        description: "Gets profile information on the given Steam user",
        usage: ',steam 76561199237717712', params: ['id']
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        const steamid = String(args[0] || '').trim();
        if (!steamid || !/^\d+$/.test(steamid)) {
            return warn(message, 'You must provide a SteamID64\n> Usage: `,steam 76561199237717712`');
        }

        let data = null;
        try {
            const res = await fetch(`https://api.evelina.bot/steam/user?id=${steamid}&key=X3pZmLq82VnHYTd6Cr9eAw`);
            if (res.ok) data = await res.json();
        } catch (err) {
            data = null;
        }

        if (!data || data.message) return warn(message, `Couldn't get information about **${steamid}**`);
        const player = data.response && data.response.players && data.response.players[0];
        if (!player) return warn(message, `Couldn't get information about **${steamid}**`);

        let title = `${player.personaname}`;
        if (player.realname) title += ` (${player.realname})`;

        const fields = [
            { name: 'Name', value: player.personaname, inline: true },
            { name: 'Reigstered', value: player.timecreated ? `<t:${player.timecreated}:R>` : 'Unknown', inline: true }
        ];
        if (player.lastlogoff) fields.push({ name: 'Last Online', value: `<t:${player.lastlogoff}:R>`, inline: true });

        const embed = {
            color: COLORS.NEUTRAL,
            title,
            url: player.profileurl,
            author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
            thumbnail: player.avatarfull ? { url: player.avatarfull } : undefined,
            fields,
            footer: { text: `SteamID: ${steamid}`, icon_url: ICONS.STEAM }
        };

        const paginator = new Paginator([embed], { userId: message.author.id });
        const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [] });
        return sent;
    }
};
