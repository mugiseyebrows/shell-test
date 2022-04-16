var argv = require('yargs')
    .command('$0 <host> <port> [options]')
    .option('c', {
        alias: 'chardet'
    })
    .option("port", {type: 'number'})
    .argv;

console.log(argv)