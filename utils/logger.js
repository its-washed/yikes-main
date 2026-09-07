const chalk = require('chalk');

const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const logger = {
    info: (m) => console.log(chalk.gray(`[${ts()}]`) + chalk.blue(' INFO ') + m),
    success: (m) => console.log(chalk.gray(`[${ts()}]`) + chalk.green(' OK   ') + m),
    warn: (m) => console.log(chalk.gray(`[${ts()}]`) + chalk.yellow(' WARN ') + m),
    error: (m) => console.log(chalk.gray(`[${ts()}]`) + chalk.red(' ERR  ') + m),
    command: (m) => console.log(chalk.gray(`[${ts()}]`) + chalk.magenta(' CMD  ') + m),
    debug: (m) => {
        if (process.env.DEBUG) {
            console.log(chalk.gray(`[${ts()}]`) + chalk.cyan(' DBG  ') + m);
        }
    }
};

module.exports = { logger };
