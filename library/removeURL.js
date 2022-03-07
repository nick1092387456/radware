const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })
const { removeAllSetting } = require('./library')

const logName = 'lastTimeDoing.txt'

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
        let removeCMD = await removeAllSetting(logName)
        for (let i = 0, j = removeCMD.length; i < j; i++) {
          stream.write(`${removeCMD[i]}`)
        }
        stream.write('logout\ny\n')
      })()
    })
  })
  .connect({
    host: process.env.HOST,
    port: 22,
    username: process.env.LOGIN_AS,
    password: process.env.PRIVATEKEY,
    algorithms: {
      kex: [
        'diffie-hellman-group1-sha1',
        'ecdh-sha2-nistp256',
        'ecdh-sha2-nistp384',
        'ecdh-sha2-nistp521',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group14-sha1',
      ],
      cipher: [
        '3des-cbc',
        'aes128-ctr',
        'aes192-ctr',
        'aes256-ctr',
        'aes128-gcm',
        'aes128-gcm@openssh.com',
        'aes256-gcm',
        'aes256-gcm@openssh.com',
      ],
      serverHostKey: [
        'ssh-rsa',
        'ecdsa-sha2-nistp256',
        'ecdsa-sha2-nistp384',
        'ecdsa-sha2-nistp521',
      ],
      hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
    },
  })
