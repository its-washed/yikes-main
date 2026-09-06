const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'deafenall',
        description: 'Deafen everyone in a voice channel',
        usage: ',deafenall [#channel]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Deafen Members` permission.')] });
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

        let count = 0;
        for (const [, member] of channel.members) {
            try {
                await member.voice.setDeaf(true, `Mass deafen by ${message.author.tag}`);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Deafen All', `Deafened **${count}** member(s) in ${channel}.`)] });
    }
};
