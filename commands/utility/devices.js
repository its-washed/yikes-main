const { COLORS } = require('../../utils/styles');

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
    data: { name: 'devices', description: 'Send what device you or another person is using', usage: ',devices its_washed', params: ['[member]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const member = message.mentions.members.first() || message.member;
        const { d, m, w, status } = deviceStatus(member);
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                description: `${status[d]} Desktop\n${status[m]} Mobile\n${status[w]} Web`,
                author: { name: `${member.user.username}'s devices`, icon_url: member.user.displayAvatarURL() }
            }]
        });
    }
};
