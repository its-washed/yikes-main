const { PermissionFlagsBits } = require('discord.js');
const { needBotPerm, prefix, confirm } = require('../../utils/moderation');
const { warn } = require('../../utils/context');
const { first } = require('../../utils/database');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    permission: "ban members",
    data: { name: 'unbanall', description: 'Unban all members from the server', usage: ',unbanall' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        if (!await needBotPerm(message, PermissionFlagsBits.BanMembers)) return;

        const config = first('SELECT owner_id, admins FROM antinuke WHERE guild_id = ?', message.guild.id);
        if (!config) {
            return warn(message, `Antinuke is **not** configured\n> Use \`${prefix(message)}antinuke setup\` to configure it`);
        }
        const allowed = [String(config.owner_id || '')];
        try {
            const admins = JSON.parse(config.admins || '[]');
            if (Array.isArray(admins)) allowed.push(...admins.map(String));
        } catch (err) {
            allowed.length = allowed.length;
        }
        if (!allowed.includes(message.author.id)) {
            return warn(message, "You **can't** use this command, you need to be an Antinuke admin");
        }

        const bans = await message.guild.bans.fetch().catch(() => null);
        if (!bans || !bans.size) return warn(message, 'There are no members that are banned');

        return confirm(message, `${message.author}: Are you sure that you want to unban **${bans.size}** members?`,
            async i => {
                const list = await i.guild.bans.fetch().catch(() => null);
                const entries = list ? [...list.values()] : [];
                await i.update({
                    embeds: [{ color: 0x729bb0, description: `${i.user}: Unbanning in progress... **0/${entries.length}** members unbanned` }],
                    components: []
                }).catch(() => {});
                const progress = await i.fetchReply().catch(() => i.message);
                for (let index = 0; index < entries.length; index++) {
                    await i.guild.bans.remove(entries[index].user.id, `Unban all by ${i.user.tag}`).catch(() => {});
                    await sleep(1000);
                    if ((index + 1) % 10 === 0 && progress) {
                        await progress.edit({
                            embeds: [{ color: 0x729bb0, description: `${i.user}: Unbanning in progress... **${index + 1}/${entries.length}** members unbanned` }]
                        }).catch(() => {});
                    }
                }
                if (progress) {
                    await progress.edit({ embeds: [successEmbed(null, `${i.user}: Successfully unbanned **${entries.length}** members`)] }).catch(() => {});
                }
            },
            async i => {
                await i.update({ embeds: [errorEmbed(null, `${i.user}: Unban everyone got canceled`)], components: [] }).catch(() => {});
            });
    }
};
