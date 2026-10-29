const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    permission: "bot developer",
    data: { name: 'installs', description: 'List all installs', usage: ',installs' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        let app;
        try {
            app = await client.application.fetch();
        } catch (err) {
            app = client.application;
        }
        const guilds = app.approximateGuildCount !== undefined ? app.approximateGuildCount : client.guilds.cache.size;
        const users = app.approximateUserInstallCount !== undefined ? app.approximateUserInstallCount : 0;
        return message.reply(`${guilds} guilds\n${users} users`);
    }
};
