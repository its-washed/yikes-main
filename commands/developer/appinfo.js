const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { COLORS } = require('../../utils/styles');

module.exports = {
    permission: "bot developer",
    data: { name: 'appinfo', description: "Get the bot's application info", usage: ',appinfo' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        let app;
        try {
            app = await client.application.fetch();
        } catch (err) {
            app = client.application;
        }

        const team = app.team;
        const teamMembers = team && team.members && team.members.size
            ? team.members.map(member => `<@${member.id}>`).join(', ')
            : 'None';

        const icon = app.iconURL({ size: 2048 });
        const embed = {
            color: COLORS.NEUTRAL,
            author: { name: app.name || 'Unknown', icon_url: icon || undefined },
            description: app.description || undefined,
            thumbnail: icon ? { url: icon } : undefined,
            fields: [
                { name: 'Team Name', value: (team && team.name) || 'None', inline: true },
                { name: 'Team Owner', value: team && team.owner ? `<@${team.owner.id}>` : 'None', inline: true },
                { name: 'Team Members', value: teamMembers, inline: true },
                { name: 'App Name', value: app.name || 'Unknown', inline: true },
                { name: 'Guilds', value: String(app.approximateGuildCount !== undefined ? app.approximateGuildCount : client.guilds.cache.size), inline: true },
                { name: 'Users', value: String(app.approximateUserInstallCount !== undefined ? app.approximateUserInstallCount : 0), inline: true },
                { name: 'Terms of Service', value: app.termsOfServiceUrl || 'None', inline: true },
                { name: 'Privacy Policy', value: app.privacyPolicyUrl || 'None', inline: true }
            ]
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite').setURL(`https://discord.com/oauth2/authorize?client_id=${app.id || client.user.id}`).setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Support Server').setURL('https://discord.gg/evelina').setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('GitHub').setURL('https://github.com/evelinabot').setStyle(ButtonStyle.Link)
        );

        return message.reply({ embeds: [embed], components: [row] });
    }
};
