import React, {Component} from 'react';
import blessed from 'blessed';
import { render } from 'react-blessed';
import { Buffer } from 'buffer'
import { IAC, DO, Telnet } from './telnet'

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      maxscroll: 0,
      unseen: 0,
      scroll: -1,
      input: '',
      output: [],
      history: [],
      pointer: undefined
    }
    props.screen.on('keypress', this.onInput.bind(this))
    props.telnet.on('data', this.onOutput.bind(this))
  }
  componentDidMount() {
    this.refs.box.on('scroll', this.onScroll.bind(this))
  }
  onInput(char, key) {
    switch (key.full) {
      case 'C-l': {
        this.setState({
          output: [],
        })
      }
      case 'C-w': {
        this.setState({
          pointer: undefined,
          input: this.state.input.replace(/(\w+|[^a-zA-Z\d\s:])\s*$/, '')
        })
        break
      }
      case 'C-x': {
        this.setState({
          pointer: undefined,
          input: '',
        })
        break
      }
      case 'C-p': {
        if (this.state.history.length === 0) {
          break
        }
        if (this.state.pointer === undefined) {
          this.setState({
            pointer: this.state.history.length - 1,
            input: this.state.history[this.state.history.length - 1],
          })
          break
        }
        const pointer = Math.max(this.state.pointer - 1, 0)
        this.setState({
          pointer: pointer,
          input: this.state.history[pointer],
        })
        break
      }
      case 'C-n': {
        if (this.state.history.length === 0) {
          break
        }
        if (this.state.pointer === undefined) {
          this.setState({
            pointer: 0,
            input: this.state.history[0],
          })
          break
        }
        const pointer = Math.min(this.state.pointer + 1, this.state.history.length - 1)
        this.setState({
          pointer: pointer,
          input: this.state.history[pointer],
        })
        break
      }
      case 'backspace': {
        this.setState(state => ({
          input: state.input.substring(0, state.input.length - 1),
          pointer: undefined,
        }))
        break
      }
      case 'return': {
        if (this.state.input.length > 0) {
          this.props.telnet.write(`${this.state.input}\n`)
          const cleaninput = this.state.input.replace(/[^\x20-\x7E]+/g, '');
          const lastinputsame = this.state.history.slice(-1)[0] === cleaninput
          this.setState(state => ({
            input: '',
            output: [...state.output, `${this.state.input}\n`],
            history: cleaninput.length === 0 || lastinputsame
              ? this.state.history
              : [...this.state.history, cleaninput],
            pointer: undefined,
          }))
        }
        break
      }
      default: {
        if (char) {
          this.setState(state => ({
            input: state.input + char,
            pointer: undefined,
          }))
        }
        break
      }
    }
    this.refs.box.setScrollPerc(100)
  }
  onScroll() {
    const max = this.refs.box.getScrollHeight() - 1
    const curr = this.refs.box.getScroll()
    const next = curr >= max ? -1 : curr 
    this.setState({ 
      maxscroll: max,
      scroll: next,
      unseen: next === -1 ? 0 : this.state.unseen,
    })
  }
  onOutput(data) {
    this.setState(state => ({
      output: [...state.output, data],
      unseen: this.state.scroll !== -1 ? state.unseen + 1 : 0,
      maxscroll: this.refs.box.getScrollHeight() - 1,
    }))
    if (this.state.scroll === -1) {
      this.refs.box.setScrollPerc(100)
    }
  }
  render() {
    const histlen = this.state.history.length
    const pointer = this.state.pointer !== undefined
      ? `${this.state.pointer+1}/${histlen}: `
      : ''
    const output = this.state.output
      .map(line => line)
      .join('')
      .replace(/[\r]/g, '')
    const lastOutput = this.state.output[this.state.output.length - 1]
    const input = `${pointer}${this.state.input}`
    const unseen = this.state.unseen
    const scroll = this.state.scroll
    const maxscroll = this.state.maxscroll
    return (
        <box
          width="100%"
          height="100%"
          style={{ fg: '#3d2516' }}
          ch="/"
        >
          <box
            ref="box"
            scrollable={true}
            mouse={true}
            top={0}
            left="center"
            width="100%"
            height="100%"
            content={`${output}${input}`}
          />
          {(unseen > 0 || scroll !== -1) && (
            <box
              top={0}
              right={0}
              height={1}
              width="100%"
              style={{ }}
              content={`[unseen: ${unseen}, scroll: ${scroll}/${maxscroll}]: ${lastOutput}`}
            />
          )}
      </box>
    );
  }
}


const [host, port] = process.argv.slice(2)
const client = new Telnet(port || 23, host)

client.on('close', () => {
  console.log('\nBye now!')
  process.exit()
})

// client.on('command', command => {
//   if (command.option == 201 && command.subcmd) {
//     const subcmdbuf = Buffer.from(command.subcmd)
//     console.log('\ngmcp:', subcmdbuf.toString('utf8'))
//   } else {
//     console.log(command)
//   }
// })

// client.write([
//   // IAC, DONT, 86,
//   // IAC, DONT, 85,
//   // IAC, DO, 102,
//   // IAC, DO, 200,
//   IAC, DO, 201,
//   // IAC, WILL, 102,
//   // IAC, WILL, 24,
//   // IAC, WILL, 31,
// ])

const screen = blessed.screen({
  smartCSR: true,
  terminal: 'xterm-256color',
  fullUnicode: true,
});

screen.key(['C-c'], function(ch, key) {
  process.exit()
});

render(<App screen={screen} telnet={client} />, screen);

