const { paginate, warn } = require('../../utils/context');

module.exports = {
    data: { name: 'muted', description: 'Returns a list of muted members whose mute is still active', usage: ',muted' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const now = Date.now();
        const members = [...message.guild.members.cache.values()]
            .filter((member) => member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > now);
        if (!members.length) return warn(message, 'No muted members found');
        const entries = members.map((member) =>
            `${member} - <t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>`);
        return paginate(message, entries, `Muted in ${message.guild.name}`, {
            name: message.guild.name,
            icon_url: message.guild.iconURL()
        });
    }
};
