const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { blacklisted, warnMedia } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

module.exports = {
    data: { name: 'gunslink', description: 'Connect your Discord account to Guns.lol', usage: ',gunslink <uid>' },
    aliases: [],
    cooldown: 5,

    execute: async (message, args) => {
        const uid = parseInt(args[0], 10);
        if (!Number.isInteger(uid)) return warn(message, 'Usage: `gunslink <uid>`');
        if (await blacklisted(message)) return;
        const data = await getJson(`https://api.evelina.bot/guns/uid?id=${encodeURIComponent(uid)}`);
        if (!data || data.message !== undefined) return warnMedia(message, 'Given guns.lol account does not exist');
        if (!data.discord) {
            const embed = createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${message.author}: You have to link your discord account to your guns.lol account first` });
            embed.setImage('https://images.guns.lol/4sLQa.png');
            return message.reply({ embeds: [embed] });
        }
        if (String(data.discord.id) !== String(message.author.id)) return warnMedia(message, 'You can only link your own guns.lol account');

        const check = first('SELECT * FROM guns WHERE user_id = ?', message.author.id);
        if (!check) {
            run('INSERT OR REPLACE INTO guns (user_id, uid) VALUES (?, ?)', message.author.id, uid);
            return approve(message, `Successfully linked your guns.lol account to [**${data.username}**](https://guns.lol/${data.username})`);
        }
        if (String(check.uid) === String(uid)) {
            return warnMedia(message, `You have already linked this guns.lol account to [**${data.username}**](https://guns.lol/${data.username})`);
        }
        const oldData = await getJson(`https://api.evelina.bot/guns/uid?id=${encodeURIComponent(String(check.uid))}`);
        if (oldData && oldData.discord && String(oldData.discord.id) === String(message.author.id)) {
            run('UPDATE guns SET uid = ? WHERE user_id = ?', uid, message.author.id);
            return approve(message, `Successfully updated your linked guns.lol account to [**${data.username}**](https://guns.lol/${data.username})`);
        }
        run('DELETE FROM guns WHERE user_id = ?', message.author.id);
        if (String(data.discord.id) === String(message.author.id)) {
            run('INSERT OR REPLACE INTO guns (user_id, uid) VALUES (?, ?)', message.author.id, uid);
            return approve(message, `Successfully linked the new guns.lol account [**${data.username}**](https://guns.lol/${data.username})`);
        }
        return warnMedia(message, 'You can only link your own guns.lol account');
    }
};
