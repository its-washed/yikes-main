const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { suggestionRows, suggestionEmbed } = require('../../utils/suggestion');

module.exports = {
    data: { name: 'suggest', description: 'Submit a suggestion', usage: ',suggest <content>' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        const content = args.join(' ').trim();
        if (!content) return warn(message, 'Usage: `suggest <content>`');

        const moduleRow = first('SELECT suggestion FROM modules WHERE guild_id = ?', message.guild.id);
        if (!moduleRow || !moduleRow.suggestion) {
            return warn(message, 'Suggestion module is **not** enabled\n> Use `,suggestion enable` to enable it');
        }
        const blacklist = first('SELECT reason FROM suggestions_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
        if (blacklist) {
            return warn(message, `You got blacklisted from creating suggestion.\n> **Reason:** ${blacklist.reason}`);
        }
        const settings = first('SELECT channel_id, role_id FROM suggestions_module WHERE guild_id = ?', message.guild.id);
        if (!settings || !settings.channel_id || !settings.role_id) {
            return warn(message, `Suggestion settings are not properly configured for this server.\n> Be sure you setuped \`,suggestion channel\` & \`,suggestion role\``);
        }
        const channel = message.guild.channels.cache.get(String(settings.channel_id));
        if (!channel) {
            return warn(message, 'Suggestion channel not found or bot lacks permissions to access it.');
        }
        try {
            const sent = await channel.send({ embeds: [suggestionEmbed(message.author, content)], components: suggestionRows() });
            run('INSERT INTO suggestions (guild_id, channel_id, message_id, author_id, content) VALUES (?, ?, ?, ?, ?)',
                message.guild.id, sent.channel.id, sent.id, message.author.id, content);
            const threadRow = first('SELECT threads FROM suggestions_module WHERE guild_id = ?', message.guild.id);
            if (threadRow && threadRow.threads) {
                sent.startThread({ name: `Discussion for Suggestion from ${message.author.username}`, autoArchiveDuration: 10080 }).catch(() => {});
            }
            const sentReply = await approve(message, `Your [**suggestion**](${sent.url}) has been submitted!`);
            message.delete().catch(() => {});
            return sentReply;
        } catch (err) {
            return warn(message, `Failed to submit the suggestion\n \`\`\`${err.message}\`\`\``);
        }
    }
};
