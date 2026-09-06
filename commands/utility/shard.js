const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'shard', description: 'Show shard info', usage: ',shard' },
    aliases: ['shardinfo'],
    cooldown: 5,
    async execute(message, client) {
        const shard = message.guild.shardId;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Shard Info', fields: [{ name: 'Shard', value: `${shard}`, inline: true }, { name: 'Total', value: `${client.ws.shards.size}`, inline: true }, { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }] })] });
    }
};
