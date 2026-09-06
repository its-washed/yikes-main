const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'purge',
        description: 'Bulk delete messages',
        usage: ',purge [amount] [--user @user] [--bot] [--links] [--images]'
    },
    aliases: ['clear', 'prune'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Manage Messages` permission.')] });
        }

        let amount = parseInt(args[0]) || 10;
        amount = Math.min(Math.max(amount, 1), 100);

        const userFlag = args.find(a => a.toLowerCase() === '--user');
        const botFlag = args.find(a => a.toLowerCase() === '--bot');
        const linkFlag = args.find(a => a.toLowerCase() === '--links');
        const imageFlag = args.find(a => a.toLowerCase() === '--images');

        let targetUser = null;
        if (userFlag) {
            const userIdx = args.indexOf('--user');
            const userArg = args[userIdx + 1];
            if (userArg) {
                const member = message.mentions.members.first() || message.guild.members.cache.get(userArg.replace(/[<@!>]/g, ''));
                if (member) targetUser = member.user;
            }
        }

        try {
            const fetched = await message.channel.messages.fetch({ limit: amount + 1 });
            let messages = Array.from(fetched.values());
            messages = messages.filter(m => m.id !== message.id);

            if (targetUser) {
                messages = messages.filter(m => m.author.id === targetUser.id);
            }
            if (botFlag) {
                messages = messages.filter(m => m.author.bot);
            }
            if (linkFlag) {
                messages = messages.filter(m => /https?:\/\//i.test(m.content));
            }
            if (imageFlag) {
                messages = messages.filter(m => m.attachments.size > 0 || /https?:\/\/.*\.(png|jpg|gif|webp)/i.test(m.content));
            }

            messages = messages.slice(0, 100);

            if (messages.length === 0) {
                return message.reply({ embeds: [errorEmbed('No Messages', 'No messages found matching your criteria.')] });
            }

            await message.channel.bulkDelete(messages, true);

            return message.reply({
                embeds: [successEmbed('Messages Purged', `Deleted **${messages.length}** message(s).`)]
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to purge: ${error.message}`)] });
        }
    }
};
