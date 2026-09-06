const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'nuke',
        description: 'Clone and recreate a channel',
        usage: ',nuke [#channel]'
    },
    aliases: ['clone'],
    cooldown: 30,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Administrator` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        const confirmEmbed = createEmbed({
            color: 0xff4757,
            title: 'Channel Nuke Confirmation',
            description: `Are you sure you want to nuke ${channel}?\nAll messages will be deleted permanently.\n\nReact with ✅ to confirm or ❌ to cancel.`
        });

        const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
        await confirmMsg.react('✅');
        await confirmMsg.react('❌');

        const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        const collector = confirmMsg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '✅') {
                try {
                    const newChannel = await channel.clone({
                        reason: `Nuked by ${message.author.tag}`
                    });

                    await newChannel.setPosition(channel.position);

                    await newChannel.send({
                        embeds: [createEmbed({
                            color: 0xff4757,
                            title: 'Channel Nuked',
                            description: `This channel was nuked by ${message.author}.`
                        })]
                    });

                    if (channel.id !== message.channel.id) {
                        await channel.delete({ reason: `Nuked by ${message.author.tag}` });
                    }
                } catch (error) {
                    await confirmMsg.edit({ embeds: [errorEmbed('Error', `Failed to nuke: ${error.message}`)] });
                }
            } else {
                await confirmMsg.edit({ embeds: [successEmbed('Cancelled', 'Channel nuke cancelled.')] });
            }
            await confirmMsg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirmMsg.edit({ embeds: [errorEmbed('Timed Out', 'Channel nuke cancelled.')] });
                confirmMsg.reactions.removeAll();
            }
        });
    }
};
