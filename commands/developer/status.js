const { createEmbed, COLORS, permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    permission: "bot developer",
    data: { name: 'status', description: '', usage: ',status' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) {
            return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
        }

        const cpu = process.cpuUsage();
        const memory = process.memoryUsage();
        const totalMemory = require('os').totalmem() / 1024 / 1024;
        const usedMemory = memory.rss / 1024 / 1024;
        const cpuPercent = (cpu.user + cpu.system) / 1000000;
        const handles = typeof process.getActiveResourcesInfo === 'function' ? process.getActiveResourcesInfo() : [];

        const embed = createEmbed({
            title: '📊 Bot Performance',
            color: COLORS.NEUTRAL,
            fields: [
                { name: '🔧 CPU (Total)', value: `${cpuPercent.toFixed(2)}%`, inline: true },
                { name: '🔧 CPU (Bot)', value: `${((cpu.user / 1000000) + (cpu.system / 1000000)).toFixed(2)}%`, inline: true },
                { name: '🧠 RAM (Bot)', value: `${usedMemory.toFixed(2)} MB / ${totalMemory.toFixed(2)} MB`, inline: true },
                { name: '⚙️ Active Tasks', value: `${handles.length} active handles`, inline: true },
                { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`, inline: true }
            ]
        });

        const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
        const filename = `active_tasks_${stamp}.txt`;
        const lines = [`Total Active Tasks: ${handles.length}`, ''];
        handles.forEach((h, i) => lines.push(`Task ${i + 1}:\n  Task: ${h}`));
        const content = lines.join('\n\n');

        return message.reply({
            embeds: [embed],
            files: [{ attachment: Buffer.from(content, 'utf8'), name: filename }]
        });
    }
};
