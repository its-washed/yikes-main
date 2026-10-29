const { COLORS, EMOJIS } = require('../../utils/styles');
const { first, query } = require('../../utils/database');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ordinal(n) {
    const num = Number(n);
    if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
    switch (num % 10) {
        case 1: return `${num}st`;
        case 2: return `${num}nd`;
        case 3: return `${num}rd`;
        default: return `${num}th`;
    }
}

function deviceStatus(member) {
    const presence = member.presence;
    const statusOf = (key) => {
        if (!presence || !presence.clientStatus) return 'offline';
        return presence.clientStatus[key] || 'offline';
    };
    let d = statusOf('desktop');
    let m = statusOf('mobile');
    let w = statusOf('web');
    const streaming = Boolean(presence && presence.activities && presence.activities.some((a) => a.type === 'streaming'));
    if (streaming) {
        if (d !== 'offline') d = 'streaming';
        if (m !== 'offline') m = 'streaming';
        if (w !== 'offline') w = 'streaming';
    }
    const status = {
        online: '🟢',
        idle: '🟡',
        dnd: '🔴',
        offline: '⚫',
        streaming: '🟣'
    };
    return { d, m, w, status };
}

module.exports = {
    data: { name: 'info', description: 'View information about a user', usage: ',info its_washed', params: ['[member]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const member = message.mentions.members.first() || message.member;
        const timezoneRow = first('SELECT zone FROM timezone WHERE user_id = ?', member.id);
        const birthdayData = first('SELECT * FROM birthday WHERE user_id = ?', member.id);
        let birthday = null;
        if (birthdayData) {
            birthday = `${MONTHS[birthdayData.month - 1]} ${ordinal(birthdayData.day)}`;
        }
        const languageRow = first('SELECT languages FROM language WHERE user_id = ?', member.id);
        let language = [];
        if (languageRow && languageRow.languages) {
            try { language = JSON.parse(languageRow.languages); } catch (err) { language = []; }
        }
        const languages = language.length ? language.join(', ') : EMOJIS.DENY;
        const { d, m, w, status } = deviceStatus(member);
        const devices = `${status[d]} Desktop ${status[m]} Mobile ${status[w]} Web`;

        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                author: { name: `${member.user.username} (${member.id})`, icon_url: member.user.displayAvatarURL() },
                fields: [
                    { name: 'Timezone', value: timezoneRow ? timezoneRow.zone : EMOJIS.DENY, inline: true },
                    { name: 'Birthday', value: birthday || EMOJIS.DENY, inline: true },
                    { name: 'Languages', value: languages, inline: true },
                    { name: 'Devices', value: devices, inline: false }
                ]
            }]
        });
    }
};
