const fs = require('fs')
const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
const dir = path.resolve(__dirname, '../public')
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })
const {
  parseCSV,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
} = require('./library')

conn
  .on('ready', () => {
    console.log('Client :: ready')
    conn.shell((err, stream) => {
      if (err) throw err
      let result = ''
      stream
        .on('data', (data) => {
          result += data.toString()
          console.log(data.toString())
        })
        .on('close', () => {
          console.log('Stream :: close')
          conn.end()
        })
      fs.readdir(dir, (err, fileNames) => {
        if (err) throw err
        for (let i = 0, j = fileNames.length; i < j; i++) {
          ;(async () => {
            let url = await parseCSV(fileNames[i])
            let platform = ''
            if (fileName === 'Hinet清單.csv') {
              platform = 'Hinet_'
            } else if (fileName === 'GSN清單.csv') {
              platform = 'GSN_'
            }
            let filterCMD = await buildFilterCommand(url, platform)
            for (let i = 0, j = filterCMD.length; i < j; i++) {
              stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
            }

            let featureCMD = await buildFeatureCommand(url)
            for (let i = 0, j = featureCMD.length; i < j; i++) {
              stream.write(`${featureCMD[i]}\n\n\n\n`)
            }

            for (let i = 0, j = url.length; i <= j; i++) {
              let id = 320001 + i
              stream.write(`${packCommand(id)}\n`)
            }

            stream.write('logout\ny\n')
          })()
        }
      })
    })
  })
  .connect({
    host: process.env.HOST,
    port: 22,
    username: process.env.USERNAME.toLocaleLowerCase(),
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
