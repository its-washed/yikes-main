const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'poll',
        description: 'Create a poll',
        usage: ',poll [question] | [option1] | [option2] | ...'
    },
    aliases: [],
    cooldown: 30,

    async execute(message, args) {
        const content = args.join(' ');
        if (!content || !content.includes('|')) {
            return message.reply({
                embeds: [errorEmbed('Invalid Format', 'Usage: ,poll [question] | [option1] | [option2]\nMinimum 2 options, maximum 10.')]
            });
        }

        const parts = content.split('|').map(p => p.trim());
        const question = parts[0];
        const options = parts.slice(1).filter(o => o.length > 0);

        if (options.length < 2) {
            return message.reply({ embeds: [errorEmbed('Too Few Options', 'Polls need at least 2 options.')] });
        }

        if (options.length > 10) {
            return message.reply({ embeds: [errorEmbed('Too Many Options', 'Polls can have at most 10 options.')] });
        }

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const description = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0x6c5ce7)
            .setTitle(question)
            .setDescription(description)
            .setFooter({ text: `Poll by ${message.author.tag} • React to vote!` })
            .setTimestamp();

        const pollMsg = await message.channel.send({ embeds: [embed] });

        for (let i = 0; i < options.length; i++) {
            await pollMsg.react(emojis[i]);
        }

        await message.delete().catch(() => {});
    }
};
