const { first } = require('../../utils/database');
const { paginate } = require('../../utils/context');

module.exports = {
    data: { name: 'seen', description: 'Check when a user was last seen', usage: ',seen its_washed', params: ['[user]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const timeGuild = first('SELECT time FROM seen WHERE user_id = ? AND guild_id = ?', user.id, message.guild.id);
        const timeGlobal = first('SELECT time FROM seen WHERE user_id = ? ORDER BY time DESC LIMIT 1', user.id);
        const guildSeen = timeGuild ? `<t:${Math.floor(timeGuild.time)}:R>` : '**never**';
        const globalSeen = timeGlobal ? `<t:${Math.floor(timeGlobal.time)}:R>` : '**never**';
        return message.reply({
            content: `**${user}** was last seen ${guildSeen} in this server and ${globalSeen} globally`,
            allowedMentions: { users: [] }
        });
    }
};
