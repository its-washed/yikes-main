const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'members', description: 'Count member types', usage: ',members' },
    aliases: ['membercount'],
    cooldown: 5,
    async execute(message) {
        const g = message.guild;
        await g.members.fetch();

        const humans = g.members.cache.filter(m => !m.user.bot).size;
        const bots = g.members.cache.filter(m => m.user.bot).size;
        const online = g.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;
        const offline = g.members.cache.filter(m => !m.presence || m.presence.status === 'offline' || m.presence.status === 'invisible').size;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Members — ${g.name}`,
                fields: [
                    { name: 'Total', value: `${g.memberCount}`, inline: true },
                    { name: 'Humans', value: `${humans}`, inline: true },
                    { name: 'Bots', value: `${bots}`, inline: true },
                    { name: 'Online', value: `${online}`, inline: true },
                    { name: 'Offline', value: `${offline}`, inline: true }
                ]
            })]
        });
    }
};
