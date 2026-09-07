const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'debug', description: 'Debug information (Developer only)', usage: ',debug' },
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const mem = process.memoryUsage();
        const uptime = process.uptime();
        const cpu = process.cpuUsage();

        return message.reply({
            embeds: [createEmbed({
                color: 0x2f3542,
                title: 'Debug Info',
                fields: [
                    { name: 'RSS', value: `${Math.round(mem.rss / 1024 / 1024)}MB`, inline: true },
                    { name: 'Heap Used', value: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`, inline: true },
                    { name: 'Heap Total', value: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`, inline: true },
                    { name: 'External', value: `${Math.round(mem.external / 1024 / 1024)}MB`, inline: true },
                    { name: 'Array Buffers', value: `${Math.round(mem.arrayBuffers / 1024 / 1024)}MB`, inline: true },
                    { name: 'Uptime', value: `${Math.round(uptime)}s`, inline: true },
                    { name: 'CPU User', value: `${Math.round(cpu.user / 1000)}ms`, inline: true },
                    { name: 'CPU System', value: `${Math.round(cpu.system / 1000)}ms`, inline: true },
                    { name: 'Pid', value: `${process.pid}`, inline: true },
                    { name: 'Node', value: process.version, inline: true },
                    { name: 'Platform', value: process.platform, inline: true },
                    { name: 'Arch', value: process.arch, inline: true },
                    { name: 'GC', value: global.gc ? 'Exposed' : 'Not exposed', inline: true },
                    { name: 'WS Clients', value: `${client.guilds.cache.size} guilds`, inline: true },
                    { name: 'Cache', value: `Commands: ${client.commands.size}, Aliases: ${client.aliases.size}`, inline: true }
                ]
            })]
        });
    }
};
