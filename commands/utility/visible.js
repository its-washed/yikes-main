const { paginate } = require('../../utils/context');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'visible', description: '', usage: ',visible' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        if (message.channel.type !== ChannelType.GuildText) {
            return message.reply({ content: 'This command can only be used in a text channel' });
        }
        const members = [...message.channel.members.values()]
            .filter((member) => message.channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel));
        if (!members.length) return message.reply({ content: 'No visible members found' });
        const entries = members.map((member) => `${member} (\`${member.id}\`)`);
        return paginate(message, entries, `Visible Members (${members.length})`, {
            name: message.guild.name,
            icon_url: message.guild.iconURL()
        });
    }
};
