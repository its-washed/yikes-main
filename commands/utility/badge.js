const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'badge', description: 'Check user badges', usage: ',badge [@user]' },
    aliases: ['badges'],
    cooldown: 5,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const flags = user.flags?.toArray() || [];
        const flagNames = {
            Staff: 'Discord Staff', Partner: 'Partnered Server Owner', HypesquadEvents: 'HypeSquad Events',
            BugHunterLevel1: 'Bug Hunter Level 1', BugHunterLevel2: 'Bug Hunter Level 2',
            HypeSquadBravery: 'Bravery', HypeSquadBrilliance: 'Brilliance', HypeSquadBalance: 'Balance',
            EarlySupporter: 'Early Supporter', VerifiedDeveloper: 'Verified Bot Developer',
            CertifiedModerator: 'Certified Moderator', ActiveDeveloper: 'Active Developer'
        };
        const badges = flags.length > 0 ? flags.map(f => flagNames[f] || f).join('\n') : 'No badges';
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${user.tag}'s Badges`, description: badges })] });
    }
};
