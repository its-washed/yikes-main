const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'channels', description: 'Count channel types', usage: ',channels' },
    aliases: ['channelcount'],
    cooldown: 5,
    async execute(message) {
        const g = message.guild;
        const text = g.channels.cache.filter(c => c.type === 0).size;
        const voice = g.channels.cache.filter(c => c.type === 2).size;
        const category = g.channels.cache.filter(c => c.type === 4).size;
        const announcement = g.channels.cache.filter(c => c.type === 5).size;
        const thread = g.channels.cache.filter(c => c.isThread()).size;
        const stage = g.channels.cache.filter(c => c.type === 13).size;
        const forum = g.channels.cache.filter(c => c.type === 15).size;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Channels — ${g.name}`,
                fields: [
                    { name: 'Total', value: `${g.channels.cache.size}`, inline: true },
                    { name: 'Text', value: `${text}`, inline: true },
                    { name: 'Voice', value: `${voice}`, inline: true },
                    { name: 'Category', value: `${category}`, inline: true },
                    { name: 'Announcement', value: `${announcement}`, inline: true },
                    { name: 'Thread', value: `${thread}`, inline: true },
                    { name: 'Stage', value: `${stage}`, inline: true },
                    { name: 'Forum', value: `${forum}`, inline: true }
                ]
            })]
        });
    }
};
