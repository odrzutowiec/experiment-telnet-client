const events = require('events')
const net = require('net')
const stream = require('stream')
const buffer = require('buffer').Buffer

const COMMAND = Symbol()
const OPTION = Symbol()
const SUBNEG = Symbol()
const SUBCMD = Symbol()

const SUBEND = 240
const SUBBEG = 250
const WILL = 251
const WONT = 252
const DO = 253
const DONT = 254
const IAC = 255

class TelnetStream extends stream.Transform {
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

class Telnet extends events {
  constructor(port, host) {
    super()
    this.socket = new net.Socket()
    this.out = new TelnetStream()
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
  }
  async print() {
    process.stdout.write(await this.read())
  }
  write(data) {
    data = data instanceof Array
      ? buffer.from(data)
      : data
    return new Promise(resolve => this.socket.write(data, resolve))
  }
}

(async () => {
  const aard = new Telnet(23, 'aardwolf.org')
  aard.on('command', command => console.log(command))
  await aard.print()
  await aard.write([
    IAC, DONT, 86,
    IAC, DONT, 85,
    IAC, DO, 102,
    IAC, DO, 200,
    IAC, DO, 201,
    IAC, WILL, 102,
    IAC, WILL, 24,
    IAC, WILL, 31,
  ])
  // await aard.print()
  await aard.write('viri\n')
  await aard.print()
  await aard.write([IAC, DONT, 1])
  await aard.print()
  await aard.write('nmb344\n')
  await aard.print()
  await aard.write('protocols\n')
  await aard.print()
  await aard.print()
  // await aard.print()
  // await aard.write('viri\n')
  // await aard.print()
  // await aard.write('nmb344\n')
  // await aard.print()
  aard.destroy()
})()
