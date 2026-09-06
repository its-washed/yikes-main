const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'threadlist', description: 'List active threads', usage: ',threadlist' },
    aliases: ['threads'],
    cooldown: 5,
    async execute(message) {
        const threads = message.guild.channels.cache.filter(c => c.isThread());
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Threads (${threads.size})`, description: threads.map(t => `${t} — ${t.memberCount} members`).join('\n').slice(0, 2000) || 'None' })] });
    }
};
