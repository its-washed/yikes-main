const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'pomodoro',
        description: 'Start a pomodoro timer',
        usage: ',pomodoro [work] [break]'
    },
    aliases: ['focus', 'timerwork'],
    cooldown: 10,

    async execute(message, args) {
        const workMin = parseInt(args[0]) || 25;
        const breakMin = parseInt(args[1]) || 5;

        const workMs = workMin * 60000;
        const breakMs = breakMin * 60000;

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Pomodoro Started',
                description: `Focus for **${workMin}** minutes!\nBreak: **${breakMin}** minutes.\n\nEnds <t:${Math.floor((Date.now() + workMs) / 1000)}:R>`,
                footer: { text: 'Work time!' }
            })]
        });

        setTimeout(async () => {
            try {
                await msg.edit({
                    embeds: [createEmbed({
                        color: 0x22c55e,
                        title: 'Work Session Complete!',
                        description: `Take a **${breakMin}** minute break!\n\nNext session ends <t:${Math.floor((Date.now() + breakMs) / 1000)}:R>`,
                        footer: { text: 'Break time!' }
                    })]
                });
                await message.author.send({ content: `Your ${workMin}-minute pomodoro session is done! Take a break.` }).catch(() => {});
            } catch {}
        }, workMs);
    }
};
