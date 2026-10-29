const { getBytes } = require('../../utils/social');
const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');

module.exports = {
    data: { name: 'cashapp', description: 'Retrieve simple CashApp profile information', usage: ',cashapp <cashtag>' },
    aliases: ['ca'],
    cooldown: 5,

    execute: async (message, args) => {
        const cashtag = args[0];
        if (!cashtag) return warnMedia(message, 'Usage: `cashapp <cashtag>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;
        const res = await fetch(`https://cash.app/$${cashtag}`).catch(() => null);
        if (!res) return warnMedia(message, 'There was a problem getting the user\'s CashApp profile');
        if (res.status === 404) return warnMedia(message, 'Cashapp profile not found');
        if (res.status !== 200) return warnMedia(message, 'There was a problem getting the user\'s CashApp profile');
        const qr = await getBytes(`https://cash.app/qr/$${cashtag}?size=288&margin=0`);
        if (!qr) return warnMedia(message, 'There was a problem getting the user\'s CashApp profile');
        return message.reply({
            content: `<https://cash.app/$${cashtag}>`,
            files: [{ attachment: qr, name: 'cashapp_qr.png' }]
        });
    }
};
