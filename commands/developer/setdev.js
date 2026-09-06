const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { loadDevData, saveDevData } = require('../../utils/developer');

module.exports = {
    data: { name: 'setdev', description: 'Add/remove a developer (Developer only)', usage: ',setdev [add/remove] [@user]' },
    aliases: [],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });

        const action = args[0];
        const target = message.mentions.users.first();
        if (!action || !target) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,setdev [add/remove] [@user]')] });

        const data = loadDevData();

        if (action === 'add') {
            if (data.developers.includes(target.id)) return message.reply({ embeds: [errorEmbed('Already Developer', `${target.tag} is already a developer.`)] });
            data.developers.push(target.id);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Added **${target.tag}** as a developer.`)] });
        } else if (action === 'remove') {
            if (!data.developers.includes(target.id)) return message.reply({ embeds: [errorEmbed('Not Developer', `${target.tag} is not a developer.`)] });
            data.developers = data.developers.filter(id => id !== target.id);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Removed **${target.tag}** from developers.`)] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add` or `remove`.')] });
        }
    }
};
