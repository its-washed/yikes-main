const { paginate } = require('../../utils/context');
const { EMOJIS, COLORS } = require('../../utils/styles');

const PERMISSION_NAMES = [
    'add_reactions', 'administrator', 'attach_files', 'ban_members', 'change_nickname', 'connect',
    'create_instant_invite', 'create_private_threads', 'create_public_threads', 'deafen_members',
    'embed_links', 'kick_members', 'manage_channels', 'manage_emojis_and_stickers', 'manage_events',
    'manage_guild', 'manage_messages', 'manage_nicknames', 'manage_permissions', 'manage_roles',
    'manage_threads', 'manage_webhooks', 'mention_everyone', 'moderate_members', 'move_members',
    'mute_members', 'priority_speaker', 'read_message_history', 'request_to_speak', 'send_messages',
    'send_messages_in_threads', 'send_tts_messages', 'speak', 'stream', 'use_application_commands',
    'use_embedded_activities', 'use_external_emojis', 'use_external_stickers', 'use_voice_activation',
    'view_audit_log', 'view_channel', 'view_guild_insights'
];

const DANGEROUS = new Set([
    'administrator', 'ban_members', 'kick_members', 'mention_everyone', 'manage_channels',
    'manage_events', 'manage_emojis_and_stickers', 'manage_guild', 'manage_roles', 'manage_messages',
    'manage_webhooks', 'manage_permissions', 'manage_threads', 'moderate_members', 'mute_members',
    'deafen_members', 'move_members'
]);

function toFlagName(key) {
    return key.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
}

module.exports = {
    data: { name: 'permissions', description: 'View permissions of a member or role', usage: ',permissions [member|role]' },
    aliases: ['perms'],
    cooldown: 3,
    async execute(message, args) {
        const guild = message.guild;
        let target = null;
        let isRole = false;

        const mentionedRole = message.mentions.roles.first();
        const mentionedMember = message.mentions.members.first();
        if (mentionedRole) {
            target = mentionedRole;
            isRole = true;
        } else if (mentionedMember) {
            target = mentionedMember;
        } else if (args[0]) {
            const id = String(args[0]).replace(/[<@!&>]/g, '');
            const role = guild.roles.cache.get(id);
            const member = guild.members.cache.get(id);
            if (role) { target = role; isRole = true; }
            else if (member) target = member;
        }
        if (!target) target = message.member;

        const permissions = isRole ? target.permissions : target.guildPermissions;
        const title = isRole ? `${target.name} Role Permissions` : `${target.name}'s Permissions`;

        const perms = PERMISSION_NAMES.map(name => {
            let granted = false;
            try { granted = Boolean(permissions.has(toFlagName(name))); } catch (e) { granted = false; }
            const icon = DANGEROUS.has(name) && granted ? EMOJIS.WARNING : granted ? EMOJIS.APPROVE : EMOJIS.DENY;
            return { name, text: `${icon} ${name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` };
        });

        perms.sort((a, b) => (DANGEROUS.has(b.name) ? 1 : 0) - (DANGEROUS.has(a.name) ? 1 : 0));
        return paginate(message, perms.map(p => p.text), title, {
            name: guild.name,
            icon_url: guild.iconURL({ size: 256 }) || undefined
        }, { color: COLORS.NEUTRAL });
    }
};
