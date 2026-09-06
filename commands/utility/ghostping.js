const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'ghostping',
        description: 'Ping someone then delete it after 3 seconds',
        usage: ',ghostping @user'
    },
    aliases: ['gp', 'spook'],
    cooldown: 10,

    async execute(message, args) {
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Mention a user to ghost ping.')] });
        }

        await message.delete().catch(() => {});

        const pingMsg = await message.channel.send({ content: `${target}` });

        setTimeout(() => {
            pingMsg.delete().catch(() => {});
        }, 3000);
    }
};
