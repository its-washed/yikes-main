const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'bmi', description: 'Calculate BMI', usage: ',bmi <weight_kg> <height_m>' },
    cooldown: 3,
    async execute(message, args) {
        const weight = parseFloat(args[0]);
        const height = parseFloat(args[1]);
        if (!weight || !height || weight <= 0 || height <= 0) {
            return message.reply({ embeds: [{ color: 0xff4757, description: 'Usage: ,bmi <weight_kg> <height_m>\nExample: ,bmi 70 1.75' }] });
        }

        const bmi = (weight / (height * height)).toFixed(1);
        let category;
        if (bmi < 18.5) category = 'Underweight';
        else if (bmi < 25) category = 'Normal';
        else if (bmi < 30) category = 'Overweight';
        else category = 'Obese';

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'BMI Calculator', description: `**BMI:** ${bmi}\n**Category:** ${category}` })] });
    }
};
