const { createEmbed, errorEmbed } = require('../../utils/embeds');

const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the scarecrow win an award? He was outstanding in his field!",
    "What do you call a fake noodle? An impasta!",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "I'm reading a book about anti-gravity. It's impossible to put down!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why did the math book look so sad? Because it had too many problems!",
    "What do you call a dog that does magic tricks? A Labracadabrador!",
    "Why can't a bicycle stand on its own? It's two-tired!",
    "What did the ocean say to the beach? Nothing, it just waved!",
    "Why did the cookie go to the doctor? Because it felt crummy!",
    "What's a skeleton's least favorite room? The living room!",
    "Why did the student eat his homework? Because the teacher told him it was a piece of cake!",
    "What do you call a sleeping dinosaur? A dino-snore!",
    "Why can't you give Elsa a balloon? Because she will let it go!",
    "What do you call cheese that isn't yours? Nacho cheese!",
    "Why did the gorilla fall out of the tree? Because it was dead!",
    "What do you call a fish without eyes? A fsh!",
    "Why do cows have hooves instead of feet? Because they lactose.",
    "What's orange and sounds like a parrot? A carrot!"
];

module.exports = {
    data: {
        name: 'joke',
        description: 'Tell a random joke',
        usage: ',joke'
    },
    aliases: ['dad', 'dadwork'],
    cooldown: 3,

    async execute(message) {
        const joke = jokes[Math.floor(Math.random() * jokes.length)];

        return message.reply({
            embeds: [createEmbed({ color: 0xffeaa7, title: 'Joke', description: joke })]
        });
    }
};
