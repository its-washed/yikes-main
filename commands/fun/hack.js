const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'hack', description: 'Totally real hack someone', usage: ',hack @user' },
    cooldown: 10,
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;

        const steps = [
            `🔍 **Hacking** ${target.tag}...`,
            '🕵️ Accessing Discord servers...',
            '💻 Bypassing 2FA...',
            '📡 Tracing IP address...',
            '🔑 Stealing cookies...',
            '📧 Reading DMs...',
            '📸 Downloading selfies...',
            '💰 Checking bank account...',
            '🐕 Looking at dog pictures...',
            '✅ **Hack complete!**'
        ];

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: steps[0] })] });

        for (let i = 1; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 1500));
            await msg.edit({ embeds: [createEmbed({ color: i === steps.length - 1 ? 0x22c55e : 0xfbbf24, description: steps.slice(0, i + 1).join('\n') })] });
        }

        const hacks = [
            'IP: 127.0.0.1',
            'Password: ********',
            'Location: The Moon',
            'Secret: They use Bing',
            'Browser history: 1000 tabs open',
            'Email: totallyreal@fake.com'
        ];
        const hack = hacks[Math.floor(Math.random() * hacks.length)];
        return msg.edit({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: `Hacked ${target.tag}`,
                description: `**${hack}**\n\nJust kidding. Don't actually hack people. `
            })]
        });
    }
};
