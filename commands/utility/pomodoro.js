const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'pomodoro',
        description: 'Start a pomodoro focus timer',
        usage: ',pomodoro [work minutes] [break minutes]'
    },
    aliases: ['focus', 'study'],
    cooldown: 60,

    async execute(message, args) {
        const workMin = parseInt(args[0]) || 25;
        const breakMin = parseInt(args[1]) || 5;
        const workMs = workMin * 60000;
        const breakMs = breakMin * 60000;

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: '🍅 Pomodoro Started',
                description: `**Work:** ${workMin} minutes\n**Break:** ${breakMin} minutes\n\nFocus mode activated! I'll ping you when it's done.`
            })]
        });

        setTimeout(async () => {
            try {
                await message.reply({
                    embeds: [createEmbed({
                        color: 0x00d26a,
                        title: '🍅 Work Session Complete!',
                        description: `Great work! Take a **${breakMin} minute** break.\n\nI'll ping you when your break is over.`
                    })]
                });

                setTimeout(async () => {
                    try {
                        await message.reply({
                            embeds: [createEmbed({
                                color: 0x6c5ce7,
                                title: '🍅 Break Over!',
                                description: 'Break is over. Ready for another round?\nUse `,pomodoro` again to start.'
                            })]
                        });
                    } catch {}
                }, breakMs);
            } catch {}
        }, workMs);
    }
};
