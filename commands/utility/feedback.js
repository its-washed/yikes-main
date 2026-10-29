const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { needPerm } = require('../../utils/moderation');
const { first, run } = require('../../utils/database');
const { LOGGING_GUILD, LOGGING_SYSTEM } = require('../../utils/manage');

module.exports = {
    permission: "administrator",
    data: { name: 'feedback', description: 'Send feedback about the bot', usage: ',feedback I love this bot', params: ['text'] },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        const feedback = args.join(' ').trim();
        if (!feedback) return warn(message, 'Please provide some feedback\n> Usage: `,feedback I love this bot`');

        const check = first('SELECT 1 AS ok FROM testimonials WHERE user_id = ?', message.author.id);
        if (check) return warn(message, 'You have already submitted feedback');
        if (feedback.length < 50) return warn(message, 'Feedback must be at least 50 characters long');
        if (feedback.length > 500) return warn(message, 'Feedback must be at most 500 characters long');

        const loggingGuild = message.client.guilds.cache.get(LOGGING_GUILD);
        const channel = loggingGuild && loggingGuild.channels.cache.get(LOGGING_FEEDBACK());
        if (channel) {
            try {
                await channel.send({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        title: `Feedback from ${message.author.tag}`,
                        description: `\`\`\`${feedback}\`\`\``,
                        fields: [
                            { name: 'Guild', value: message.guild.name, inline: true },
                            { name: 'User', value: `${message.author}`, inline: true },
                            { name: 'Created', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`, inline: true }
                        ],
                        footer: { text: `User ID: ${message.author.id}` }
                    }]
                });
            } catch (err) {}
        }

        run('INSERT INTO testimonials (user_id, testimonial, timestamp) VALUES (?, ?, ?)',
            message.author.id, feedback, Date.now() / 1000);
        return approve(message, 'Feedback has been submitted');
    }
};

function LOGGING_FEEDBACK() {
    return process.env.LOGGING_FEEDBACK || LOGGING_SYSTEM;
}
