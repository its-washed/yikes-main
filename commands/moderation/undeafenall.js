const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'undeafenall',
        description: 'Undeafen everyone in a voice channel',
        usage: ',undeafenall [#channel]'
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
                await member.voice.setDeaf(false, `Mass undeafen by ${message.author.tag}`);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Undeafen All', `Undeafened **${count}** member(s) in ${channel}.`)] });
    }
};
