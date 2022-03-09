const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
const conn2 = new Client()
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })
const {
  parseCSV,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  removeAllSetting,
} = require('./library')

let device_1_toggle = 0
let device_2_toggle = 0

const args = process.argv.slice(2)

if (process.argv.length === 3) {
  if (args[0] === '01') device_1_toggle = 1
  if (args[0] === '02') device_2_toggle = 1
  console.log(
    `輸入錯誤!! 請輸入預更新的設備".\\addURL.js 01" 或 ".\\addURL.js 02"，若沒輸入則為全部更新`
  )
} else if (process.argv.length === 2) {
  device_1_toggle = 1
  device_2_toggle = 1
} else {
  console.log(
    `請輸入預更新的設備".\\addURL.js 01" 或 ".\\addURL.js 02"，若沒輸入則為全部更新`
  )
}

if (device_1_toggle) {
  conn
    .on('ready', () => {
      console.log('Device_01 connected')
      conn.shell((err, stream) => {
        if (err) throw err
        // let message = ''
        const fileNames = ['Hinet清單.csv', 'GSN清單.csv']
        stream
          .on('data', (data) => {
            // message += data.toString()
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log('Device_01 adding success. Connection closed.')
            // generateLog(message)
            conn.end()
          })
        ;(async () => {
          let url = []
          let removeCMD = await removeAllSetting('device_02.txt')
          for (let i = 0, j = removeCMD.length; i < j; i++) {
            stream.write(`${removeCMD[i]}`)
          }

          for (let i = 0, j = fileNames.length; i < j; i++) {
            url = url.concat(await parseCSV(fileNames[i]))
          }

          let filterCMD = await buildFilterCommand(url, 'device_01')
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
    })
}

if (device_2_toggle) {
  conn2
    .on('ready', () => {
      console.log('Device_02 connected')
      conn2.shell((err, stream) => {
        if (err) throw err
        // let message = ''
        const fileNames = ['Hinet清單.csv', 'GSN清單.csv']
        stream
          .on('data', (data) => {
            // message += data.toString()
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log('Device_02 adding success. Connection closed.')
            // generateLog(message)
            conn2.end()
          })
        ;(async () => {
          let url = []
          let removeCMD = await removeAllSetting('device_02.txt')
          for (let i = 0, j = removeCMD.length; i < j; i++) {
            stream.write(`${removeCMD[i]}`)
          }

          for (let i = 0, j = fileNames.length; i < j; i++) {
            url = url.concat(await parseCSV(fileNames[i]))
          }

          let filterCMD = await buildFilterCommand(url, 'device_02')
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
    })
}
