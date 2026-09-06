const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'iplookup',
        description: 'Look up IP info (non-malicious)',
        usage: ',iplookup [ip]'
    },
    aliases: ['ip', 'geolocate'],
    cooldown: 10,

    async execute(message, args) {
        const ip = args[0];
        if (!ip) return message.reply({ embeds: [errorEmbed('Missing IP', 'Usage: ,iplookup [ip]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'IP Lookup',
                description: '*IP lookup API not connected.*\n\nTo enable, integrate with ip-api.com or similar service.\n\n*Note: This is a placeholder.*'
            })]
        });
    }
};
