const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
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
      // let message = ''
      const fileNames = ['Hinet清單.csv', 'GSN清單.csv']
      stream
        .on('data', (data) => {
          // message += data.toString()
          console.log(data.toString())
        })
        .on('close', () => {
          console.log('Stream :: close')
          // generateLog(message)
          conn.end()
        })
      ;(async () => {
        let url = []
        for (let i = 0, j = fileNames.length; i < j; i++) {
          url = url.concat(await parseCSV(fileNames[i]))
        }

        let filterCMD = await buildFilterCommand(url)
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
    })
  })
  .connect({
    host: process.env.HOST,
    port: 22,
    username: process.env.LOGIN_AS.toLocaleLowerCase(),
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
