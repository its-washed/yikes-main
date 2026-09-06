const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { loadDevData, saveDevData } = require('../../utils/developer');

module.exports = {
    data: { name: 'blacklist', description: 'Blacklist a user from using the bot (Developer only)', usage: ',blacklist [add/remove] [@user]' },
    aliases: ['bl'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });

        const action = args[0];
        const target = message.mentions.users.first();
        if (!action || !target) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,blacklist [add/remove] [@user]')] });

        const data = loadDevData();

        if (action === 'add') {
            if (data.blacklist.includes(target.id)) return message.reply({ embeds: [errorEmbed('Already Blacklisted', `${target.tag} is already blacklisted.`)] });
            data.blacklist.push(target.id);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Blacklisted **${target.tag}**.`)] });
        } else if (action === 'remove') {
            if (!data.blacklist.includes(target.id)) return message.reply({ embeds: [errorEmbed('Not Blacklisted', `${target.tag} is not blacklisted.`)] });
            data.blacklist = data.blacklist.filter(id => id !== target.id);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Unblacklisted **${target.tag}**.`)] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add` or `remove`.')] });
        }
    }
};
