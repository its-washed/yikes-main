const { PermissionFlagsBits } = require('discord.js');
const { warn } = require('../../utils/context');
const { needPerm, noStaff, splitReason } = require('../../utils/moderation');

module.exports = {
    permission: "manage messages",
    data: { name: 'revokefiles', description: 'Remove file attachment permissions from a member', usage: ',revokefiles on its_washed nsfw', params: ['state', 'member'] },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client, config) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;

        const state = String(args[0] || '').toLowerCase();
        if (state !== 'on' && state !== 'off') {
            return warn(message, 'Invalid state please provide **on** or **off**');
        }

        const member = await noStaff(message, args[1], 'revokefiles');
        if (!member) return;

        const parsed = splitReason(args, 2);
        const reason = parsed.reason;
        const attachFiles = state === 'on' ? false : true;

        try {
            await message.channel.permissionOverwrites.edit(member, { AttachFiles: attachFiles }, {
                reason: `${message.author} (${message.author.id}) ${attachFiles ? 'removed' : 'restored'} file attachment permissions: ${reason}`
            });
        } catch (err) {
            return warn(message, `I couldn't change ${member}'s attachment permissions in ${message.channel}\n\`\`\`\`${err.message}\`\`\`\``);
        }

        await message.react('✅').catch(() => {});
    }
};
