const net = require('net')
const stream = require('stream')

/*
https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream
https://github.com/blinkdog/telnet-stream/blob/master/src/main/coffee/telnetInput.coffee
http://tintin.sourceforge.net/protocols/mtts/
https://cs.stanford.edu/~miles/iso8859.html
https://en.wikipedia.org/wiki/Telnet
https://tools.ietf.org/html/rfc854
*/

const SE = 240 // End of subnegotiation parameters
const NOP = 241 // No operation
const DATA = 242 // The data stream portion of a Synch
const BRK = 243 // NVT character Break
const IP = 244 // The function Interrupt_Process
const AO = 245 // The function Abort_output
const AYT = 246 // The function Are_You_There
const EC = 247 // The function Erase_character
const EL = 248 // The function Erase_Line
const GA = 249 // The Go_ahead  signal
const SB = 250 // Indicates that what follows is
const WILL = 251 // Indicates the desire to begin
const WONT = 252 // Indicates the refusal to perform
const DO = 253 // From now on expecting
const DONT = 254 // No longer expecting
const IAC = 255 // Data Byte 255 (Interpret As Command)

class Output extends stream.Transform {
  constructor() {
    super()
    this.setEncoding('latin1')
  }
  _transform(chunk, encoding, callback) {
    console.log(encoding)
    this.push(chunk)
    callback()
  }
}

class Socket extends net.Socket {
  constructor() {
    super()
    this.out = new Output()
    this.pipe(this.out)
  }
}

const socket = new Socket()
socket.connect(23, 'aardwolf.org')
socket.out.on('data', args => {
  for (char of args) {
    const code = char.charCodeAt() 
    if (code > 127) {
      console.log('=>', code)
    }
    else {
      process.stdout.write(char)
    }
  }
})

