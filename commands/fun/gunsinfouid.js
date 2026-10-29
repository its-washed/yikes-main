const { first } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { blacklisted, warnMedia } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { sendCard } = require('../../utils/helpCard');
const guns = require('../utility/gunsinfo');

module.exports = {
    data: { name: 'gunsinfouid', description: 'Gets profile information on the given Guns.lol UID', usage: ',gunsinfouid [uid]' },
    aliases: ['gunsuid'],
    cooldown: 5,

    execute: async (message, args, client) => {
        if (await blacklisted(message)) return;
        let uid = args.join(' ').trim();
        if (!uid) {
            const check = first('SELECT * FROM guns WHERE user_id = ?', message.author.id);
            if (check) uid = String(check.uid);
            else return sendCard(message, module.exports);
        }
        const data = await getJson(`https://api.evelina.bot/guns/uid?id=${encodeURIComponent(uid)}`);
        if (!data || data.message !== undefined) return warnMedia(message, `Couldn't get information about Guns UID **${uid}**`);
        return message.reply({ embeds: [guns.buildEmbed(data)] });
    }
};
