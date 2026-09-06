const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'massban',
        description: 'Ban multiple users at once',
        usage: ',massban [user_ids]'
    },
    aliases: [],
    cooldown: 60,

    async execute(message, args) {
        if (!message.member.permissions.has('BanMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Ban Members permission.')] });
        }

        if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Users', 'Usage: ,massban [id1] [id2] [id3]...')] });

        const reason = args.find(a => !/^\d+$/.test(a)) || 'No reason provided';
        const ids = args.filter(a => /^\d+$/.test(a));

        if (ids.length === 0) return message.reply({ embeds: [errorEmbed('No Valid IDs', 'Provide at least one user ID.')] });

        let banned = 0;
        let failed = 0;

        for (const id of ids) {
            try {
                await message.guild.members.ban(id, { reason });
                banned++;
            } catch {
                failed++;
            }
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Mass Ban Complete',
                fields: [
                    { name: 'Banned', value: `${banned}`, inline: true },
                    { name: 'Failed', value: `${failed}`, inline: true }
                ]
            })]
        });
    }
};
