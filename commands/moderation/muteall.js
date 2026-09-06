const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'muteall',
        description: 'Mute everyone in a voice channel',
        usage: ',muteall [#channel]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Mute Members` permission.')] });
        }

        let channel;
        if (args[0]) {
            const cleaned = args[0].replace(/[<#>]/g, '');
            channel = message.guild.channels.cache.get(cleaned);
        } else {
            channel = message.member.voice.channel;
        }

        if (!channel || channel.type !== 2) {
            return message.reply({ embeds: [errorEmbed('Invalid Channel', 'Join a voice channel or mention one.')] });
        }

        const members = channel.members.filter(m => !m.voice.deaf);
        if (members.size === 0) {
            return message.reply({ embeds: [errorEmbed('No Members', 'No members to mute in that channel.')] });
        }

        let count = 0;
        for (const [, member] of members) {
            try {
                await member.voice.setMute(true, `Mass muted by ${message.author.tag}`);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Mute All', `Muted **${count}** member(s) in ${channel}.`)] });
    }
};
