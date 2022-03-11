const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })
const { removeAllSetting } = require('./library')

const sshConfig = [
  {
    host: process.env.HOST_01,
    port: 22,
    username: process.env.LOGIN_AS_01,
    password: process.env.PRIVATEKEY_01,
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
  },
  {
    host: process.env.HOST_02,
    port: 22,
    username: process.env.LOGIN_AS_02,
    password: process.env.PRIVATEKEY_02,
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
  },
]

const args = process.argv.slice(2)
let logFileName = ''
let configOption = ''
let executiveSwitch = 0

if (process.argv.length === 3) {
  if (args[0] === '01') {
    executiveSwitch = 1
    logFileName = 'device_01.txt'
    configOption = 0
  } else if (args[0] === '02') {
    executiveSwitch = 1
    logFileName = 'device_02.txt'
    configOption = 1
  } else {
    console.log(
      `輸入錯誤!! 請輸入預刪除黑名單的設備".\\removeURL.js 01" 或 ".\\removeURL.js 02"`
    )
  }
} else if (process.argv.length === 2) {
  console.log(
    `請輸入預刪除黑名單的設備".\\removeURL.js 01" 或 ".\\removeURL.js 02"`
  )
}

if (executiveSwitch) {
  conn
    .on('ready', () => {
      console.log('Client :: ready')
      conn.shell((err, stream) => {
        if (err) throw err
        stream
          .on('data', (data) => {
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log('Stream :: close')
            conn.end()
          })
        ;(async () => {
          let removeCMD = await removeAllSetting(logFileName)
          for (let i = 0, j = removeCMD.length; i < j; i++) {
            stream.write(`${removeCMD[i]}`)
          }
          stream.write('logout\ny\n')
        })()
      })
    })
    .connect(sshConfig[configOption])
}
