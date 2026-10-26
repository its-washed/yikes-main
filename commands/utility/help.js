const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { errorEmbed, PRESERVE, ACCENT } = require('../../utils/embeds');
const { sendCard } = require('../../utils/helpCard');
const { isDeveloper } = require('../../utils/developer');

const SITE_URL = 'https://itswashed.lol';
const MENU_ID = 'sh_help_module';
const HOME = '__home';

function groupCommands(client, showDev) {
    const groups = {};
    client.commands.forEach(cmd => {
        const cat = cmd.category || 'other';
        if (cat === 'developer' && !showDev) return;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(cmd);
    });
    for (const cat of Object.keys(groups)) {
        groups[cat].sort((a, b) => a.data.name.localeCompare(b.data.name));
    }
    return groups;
}

function overviewEmbed(client, groups) {
    const categories = Object.keys(groups).sort();
    return {
        [PRESERVE]: true,
        color: ACCENT,
        author: { name: client.user ? client.user.username : 'scarlet hub', icon_url: client.user ? client.user.displayAvatarURL() : undefined },
        title: 'scarlet hub help',
        description: [
            '**How to use**',
            'Pick a module from the menu below to browse its commands.',
            '',
            '**Good to know**',
            'Arguments in <angle brackets> are required; arguments in [square brackets] are optional.',
            `**[TOS](${SITE_URL}) · [Privacy](${SITE_URL})**`
        ].join('\n'),
        thumbnail: client.user ? { url: client.user.displayAvatarURL({ size: 256 }) } : undefined,
        footer: { text: `${countCommands(groups)} commands • ${categories.length} modules` }
    };
}

function countCommands(groups) {
    return Object.values(groups).reduce((n, list) => n + list.length, 0);
}

function categoryDescription(cmds) {
    const list = cmds.map(c => (c.subcommands && c.subcommands.length > 0 ? `${c.data.name}*` : c.data.name)).join(', ');
    if (list.length <= 4000) return `\`\`\`\n${list}\n\`\`\``;
    return list;
}

function categoryEmbed(client, groups, cat) {
    const cmds = groups[cat];
    return {
        [PRESERVE]: true,
        color: ACCENT,
        author: { name: client.user ? client.user.username : 'scarlet hub', icon_url: client.user ? client.user.displayAvatarURL() : undefined },
        title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} — ${cmds.length} command${cmds.length === 1 ? '' : 's'}`,
        description: categoryDescription(cmds),
        footer: { text: `Use ,help <command> for details • * has subcommands • ${countCommands(groups)} commands • ${Object.keys(groups).length} modules` }
    };
}

function buildMenu(groups) {
    const categories = Object.keys(groups).sort();
    const options = [
        { label: 'Home', description: 'Back to the help overview', value: HOME, emoji: '🏠' },
        ...categories.slice(0, 24).map(cat => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            description: `${groups[cat].length} command${groups[cat].length === 1 ? '' : 's'}`,
            value: cat
        }))
    ];
    const menu = new StringSelectMenuBuilder()
        .setCustomId(MENU_ID)
        .setPlaceholder('Select a module')
        .setOptions(options);
    return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
    data: { name: 'help', description: 'Show all commands', usage: ',help [command]' },
    aliases: ['commands'],
    cooldown: 3,
    async execute(message, args, client) {
        const showDev = isDeveloper(message.author.id);

        if (args[0]) {
            const cmd = client.commands.get(args[0]) || client.commands.find(c => c.aliases && c.aliases.includes(args[0]));
            if (!cmd || (cmd.category === 'developer' && !showDev)) return message.reply({ embeds: [errorEmbed('Not Found', 'Command not found.')] });
            return sendCard(message, cmd);
        }

        const groups = groupCommands(client, showDev);
        const row = buildMenu(groups);

        const sent = await message.reply({
            embeds: [overviewEmbed(client, groups)],
            components: [row],
            [PRESERVE]: true
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async (i) => {
            const value = i.values[0];
            const embed = (value === HOME || !groups[value])
                ? overviewEmbed(client, groups)
                : categoryEmbed(client, groups, value);
            await i.update({ embeds: [embed], components: [row] }).catch(() => {});
        });

        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });

        return sent;
    }
};
