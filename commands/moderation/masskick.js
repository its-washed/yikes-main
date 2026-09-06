const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'masskick',
        description: 'Kick multiple users at once',
        usage: ',masskick [user_ids]'
    },
    aliases: [],
    cooldown: 60,

    async execute(message, args) {
        if (!message.member.permissions.has('KickMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Kick Members permission.')] });
        }

        if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Users', 'Usage: ,masskick [id1] [id2]...')] });

        const reason = args.find(a => !/^\d+$/.test(a)) || 'No reason provided';
        const ids = args.filter(a => /^\d+$/.test(a));

        let kicked = 0;
        let failed = 0;

        for (const id of ids) {
            try {
                const member = await message.guild.members.fetch(id);
                await member.kick(reason);
                kicked++;
            } catch {
                failed++;
            }
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Mass Kick Complete',
                fields: [
                    { name: 'Kicked', value: `${kicked}`, inline: true },
                    { name: 'Failed', value: `${failed}`, inline: true }
                ]
            })]
        });
    }
};
