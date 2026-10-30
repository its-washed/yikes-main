const { EmbedBuilder } = require('discord.js');
const { warn } = require('../../utils/context');
const { run } = require('../../utils/database');

module.exports = {
    data: {
        name: 'afk',
        description: "Set an AFK status for when you are mentioned",
        usage: ',afk [reason]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        if (reason.length > 100) {
            return warn(message, 'Reason for being AFK cannot exceed **100** characters');
        }

        run('INSERT OR REPLACE INTO afk_state (guild_id, user_id, reason, timestamp) VALUES (?, ?, ?, ?)',
            message.guild.id, message.author.id, reason, Date.now());

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xffd600)
                .setDescription(`😴 <@${message.author.id}>: You're now AFK with the status: **${reason}**`)
            ]
        });
    }
};
