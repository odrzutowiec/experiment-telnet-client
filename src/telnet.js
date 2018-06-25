const events = require('events')
const net = require('net')
const stream = require('stream')
const buffer = require('buffer').Buffer

export const COMMAND = Symbol()
export const OPTION = Symbol()
export const SUBNEG = Symbol()
export const SUBCMD = Symbol()

export const SUBEND = 240
export const SUBBEG = 250
export const WILL = 251
export const WONT = 252
export const DO = 253
export const DONT = 254
export const IAC = 255

export class TelnetStream extends stream.Transform {
  constructor() {
    super()
    this.setEncoding('utf8')
    this.state = undefined
    this.command = undefined
    this.option = undefined
    this.subcmd = []
  }
  _transform(chunk, encoding, callback) {
    const newchunk = buffer.alloc(chunk.length)
    let index = 0
    for (const byte of chunk) {
      const newbyte = this.handle(byte)
      if (newbyte !== undefined) {
        newchunk[index++] = newbyte
      }
    }
    this.push(newchunk)
    callback()
  }
  handle(byte) {
    switch (this.state) {
      case COMMAND:
        switch (byte) {
          case WILL:
          case WONT:
          case DO:
          case DONT:
            this.command = byte
            this.state = OPTION
            return undefined
          case SUBBEG:
            this.command = SUBBEG
            this.state = OPTION
            return undefined
          default:
            this.emit('command', { command: byte })
            this.state = undefined
            return undefined
        }
      case OPTION:
        if (this.command === SUBBEG) {
          this.option = byte
          this.state = SUBNEG
          return undefined
        }
        this.emit('command', { command: this.command, option: byte })
        this.state = undefined
        return undefined
      case SUBNEG:
        switch (byte) {
          case IAC:
            this.state = SUBCMD
            return undefined
          default:
            this.subcmd.push(byte)
            return undefined
            break;
          }
      case SUBCMD:
        switch (byte) {
          case IAC:
            this.subcmd.push(IAC)
            this.state = SUBNEG
            return undefined
          case SUBEND:
            this.emit('command', { command: this.command, option: this.option, subcmd: this.subcmd })
            this.state = undefined
            return undefined
          default:
            console.error('error')
            this.state = undefined
            return undefined
        }
      case undefined:
        this.state = undefined
        this.command = undefined
        this.option = undefined
        this.subcmd = []
        switch (byte) {
          case IAC:
            this.state = COMMAND
            return undefined
          default:
            return byte
        }
    }
  }
}

export class Telnet extends events {
  constructor(port, host) {
    super()
    this.socket = new net.Socket()
    this.out = new TelnetStream()
    this.socket.addListener('close', event => this.emit('close', event))
    this.out.addListener('data', event => this.emit('data', event))
    this.out.addListener('command', event => this.emit('command', event))
    this.socket.pipe(this.out)
    this.socket.connect(port, host)
  }
  destroy() {
    this.socket.destroy()
  }
  read() {
    return new Promise(resolve => this.once('data', data => resolve(data)))
      .catch(() => console.log('Failed read'))
  }
  async print() {
    process.stdout.write(await this.read())
  }
  write(data) {
    data = data instanceof Array
      ? buffer.from(data)
      : data
    return (new Promise(resolve => this.socket.write(data, resolve)))
      .catch(() => console.log(`Failed to write: ${data}`))
  }
}

// (async () => {
//   const aard = new Telnet(23, 'achaea.com')
//   aard.on('close', () => {
//     console.log('\nBye now!')
//     process.exit()
//   })
//   aard.on('command', command => {
//     if (command.option == 201 && command.subcmd) {
//       const subcmdbuf = buffer.from(command.subcmd)
//       console.log('\ngmcp:', subcmdbuf.toString('utf8'))
//     } else {
//       console.log(command)
//     }
//   })
//   await aard.write([
//     // IAC, DONT, 86,
//     // IAC, DONT, 85,
//     // IAC, DO, 102,
//     // IAC, DO, 200,
//     IAC, DO, 201,
//     // IAC, WILL, 102,
//     // IAC, WILL, 24,
//     // IAC, WILL, 31,
//   ])
//   aard.on('data', data => process.stdout.write(data))
//   process.stdin.on('data', data => aard.write(data))
// })()
