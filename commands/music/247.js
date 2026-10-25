const { errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { servers, ensureServer, connect } = require('./play');

module.exports = {
    data: {
        name: '247',
        description: 'Keep the bot in a voice channel 24/7 while the bot is online',
        usage: ',24/7 [#voice-channel | off]'
    },
    aliases: ['24/7', 'stay', 'stayinvc'],
    cooldown: 5,

    async execute(message, args) {
        const guildId = message.guild.id;
        const sub = (args[0] || '').toLowerCase();

        if (['off', 'disable', 'end', 'stop'].includes(sub)) {
            const server = servers.get(guildId);
            if (!server || !server.stay247) {
                return message.reply({ embeds: [errorEmbed('Not Enabled', '24/7 mode is not enabled here.')] });
            }

            server.stay247 = false;

            if (server.queue.length === 0 && !server.playing) {
                servers.delete(guildId);
                try { server.currentStream?.destroy(); } catch {}
                try { server.player.stop(true); } catch {}
                try { server.connection?.destroy(); } catch {}
                return message.reply({ embeds: [successEmbed('24/7 Disabled', 'Left voice — 24/7 mode is off.')] });
            }

            return message.reply({ embeds: [successEmbed('24/7 Disabled', '24/7 mode is off — music will keep playing and the bot will leave when the queue finishes.')] });
        }

        let target = message.mentions.channels.first();
        if (target && target.type !== 2) target = null;
        if (!target && /^\d{17,20}$/.test(args[0] || '')) {
            const found = message.guild.channels.cache.get(args[0]);
            if (found && found.type === 2) target = found;
        }
        if (!target) target = message.member.voice.channel;
        if (!target) {
            return message.reply({ embeds: [errorEmbed('No Voice Channel', 'Join a voice channel or mention one: `,24/7 #channel`.')] });
        }

        const permissions = target.permissionsFor(message.guild.members.me);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return message.reply({ embeds: [permissionDenied(message, 'connect, speak', { bot: true })] });
        }

        const server = ensureServer(guildId, message);
        const wasEnabled = server.stay247;
        server.stay247 = true;

        try {
            connect(server, guildId, message, target);
        } catch (error) {
            if (!wasEnabled) server.stay247 = false;
            return message.reply({ embeds: [errorEmbed('Connection Failed', `Could not join voice: ${error.message}`)] });
        }

        return message.reply({
            embeds: [successEmbed('24/7 Enabled', `Staying in **${target.name}** while enabled.\nUse \`,24/7 off\` to disable.`)]
        });
    }
};
