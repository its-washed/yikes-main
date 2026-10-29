const { say, warn } = require('../../utils/context');

const SANITIZE = /[^-()\d/*+.a-zA-Z% ]/g;

module.exports = {
    data: { name: 'calculate', description: 'Calculate a mathematical expression including percentages', usage: ',calculate 100 * 5', params: ['expression'] },
    aliases: ['calc', 'math'],
    cooldown: 3,
    async execute(message, args) {
        const original = args.join(' ').trim();
        if (!original) return warn(message, 'Usage: `calculate <expression>`');
        try {
            const expression = original.replace(
                /(\d+(\.\d+)?)(\s*[-+/*]\s*)(\d+(\.\d+)?)%/g,
                '$1$3($1 * $4 / 100)'
            );
            if (SANITIZE.test(expression.replace(/sqrt|pow|sin|cos|tan|pi|e/g, ''))) {
                return warn(message, `An error occurred while calculating the expression: invalid character`);
            }
            const result = Function(
                '"use strict"; const { sqrt, pow, sin, cos, tan, pi, e } = Math; return (' + expression + ')'
            )();
            if (result === undefined || result === null || Number.isNaN(result)) {
                return warn(message, `An error occurred while calculating the expression: invalid expression`);
            }
            return say(message, `Result of **${original}** is **${result}**`);
        } catch (err) {
            return warn(message, `An error occurred while calculating the expression: ${err.message}`);
        }
    }
};
