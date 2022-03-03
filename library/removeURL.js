const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })
const { removeAllSetting } = require('./library')

conn
  .on('ready', () => {
    console.log('Client :: ready')
    conn.shell((err, stream) => {
      if (err) throw err
      stream
        .on('data', (data) => {
          console.log(data.toString())
        })
        .on('close', () => {
          console.log('Stream :: close')
          conn.end()
        })
      ;(async () => {
        let removeCMD = removeAllSetting()
        removeCMD.forEach((_removeCMD) => stream.write(`${_removeCMD}`))
        stream.write('logout\ny\n')
      })()
    })
  })
  .connect({
    host: process.env.HOST,
    port: 22,
    username: process.env.USERNAME.toLocaleLowerCase(),
    password: process.env.PRIVATEKEY,
  })
