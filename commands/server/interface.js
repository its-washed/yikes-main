const { PermissionFlagsBits } = require('discord.js');
const { run } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { buildComponents, defaultButtons, interfaceEmbed, persistButtons, parseScriptButtons } = require('../../utils/voiceMaster');
const { embedReplacement, toObject } = require('../../utils/embedScript');

function resolveChannel(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.find(c => c.type === 0);
    if (mentioned) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.type === 0 && c.name.toLowerCase() === raw.toLowerCase()) || null;
}

module.exports = {
    permission: "administrator",
    data: {
        name: 'interface',
        description: 'Create a custom voice master interface',
        usage: ',interface <#channel> [code]'
    },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client, config) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;

        const channel = resolveChannel(message, args[0]);
        if (!channel) return warn(message, 'You must mention a text channel or provide an id');

        run('DELETE FROM voicemaster_buttons WHERE guild_id = ?', message.guild.id);

        const code = args.slice(1).join(' ').trim();
        if (!code) {
            const embed = interfaceEmbed(message.guild, client, {
                title: 'VoiceMaster Interface',
                description: 'Click the buttons below to control your voice channel',
                fieldName: 'Button Usage'
            });
            const buttons = defaultButtons();
            try {
                await channel.send({ embeds: [embed], components: buildComponents(buttons) });
            } catch (err) {
                return warn(message, `Failed to send the interface\n\`\`\`\`${err.message}\`\`\`\``);
            }
            persistButtons(message.guild.id, buttons);
            return;
        }

        let parsed;
        let scriptButtons;
        try {
            const replaced = embedReplacement(message.member, code);
            parsed = toObject(replaced);
            scriptButtons = parseScriptButtons(replaced);
        } catch (err) {
            return warn(message, err.message);
        }

        const buttons = scriptButtons.length ? scriptButtons : defaultButtons();
        const payload = {};
        if (parsed.content) payload.content = parsed.content;
        if (parsed.embed) payload.embeds = [parsed.embed];
        if (!payload.content && !payload.embeds) return warn(message, 'The provided script contains no embed or content');
        payload.components = buildComponents(buttons);
        try {
            await channel.send(payload);
        } catch (err) {
            return warn(message, `Failed to send the interface\n\`\`\`\`${err.message}\`\`\`\``);
        }
        persistButtons(message.guild.id, buttons);
    }
};
