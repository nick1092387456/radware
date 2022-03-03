const fs = require('fs')
const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })

conn
  .on('ready', () => {
    console.log('Client :: ready')

    conn.shell((err, stream) => {
      if (err) throw err
      stream
        .on('close', () => {
          console.log('Stream :: close')
          conn.end()
        })
        .on('data', (data) => {
          console.log('OUTPUT: ' + data)
        })
      stream.end('ls -l\nexit\n')
    })
  })
  .connect({
    host: process.env.HOST,
    port: 22,
    username: process.env.USERNAME.toLocaleLowerCase(),
    password: process.env.PRIVATEKEY,
  })
