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
  createLog,
} = require('./library')

let device_1_toggle = 0
let device_2_toggle = 0
const deviceList = ['device_01', 'device_02']

const args = process.argv.slice(2)

if (process.argv.length === 3) {
  if (args[0] === '01') {
    device_1_toggle = 1
  } else if (args[0] === '02') {
    device_2_toggle = 1
  } else {
    console.log(
      `輸入錯誤!! 請輸入預更新的設備".\\addURL.js 01" 或 ".\\addURL.js 02"，若沒輸入則為全部更新`
    )
  }
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
      console.log(`${deviceList[0]} connected`)
      conn.shell((err, stream) => {
        if (err) throw err
        let message = ''
        const fileNames = ['Hinet清單.csv', 'GSN清單.csv']
        stream
          .on('data', (data) => {
            message += data.toString()
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log(`${deviceList[0]} adding success. Connection closed.`)
            createLog(message, deviceList[0], 'CMDResponse')
            conn.end()
          })
        ;(async () => {
          let removeCMD = await removeAllSetting(`${deviceList[0]}.txt`)
          //remove last time added url.
          for (let i = 0, j = removeCMD.length; i < j; i++) {
            stream.write(`${removeCMD[i]}`)
            // console.log(removeCMD[i])
          }

          //empty previousLog
          createLog('', deviceList[0], 'previousLog')
          createLog('', deviceList[0], 'dailyLog')

          for (let i = 0, j = fileNames.length; i < j; i++) {
            let URLList = []
            let filterCMD = []
            //parse CSV list to URL
            URLList = URLList.concat(await parseCSV(fileNames[i]))
            //buildFilterCommand
            filterCMD = await buildFilterCommand(
              URLList,
              deviceList[0],
              fileNames[i]
            )

            for (let i = 0, j = filterCMD.length; i < j; i++) {
              stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
              // console.log(filterCMD[i])
            }
            let featureCMD = await buildFeatureCommand(URLList, fileNames[i])
            for (let i = 0, j = featureCMD.length; i < j; i++) {
              stream.write(`${featureCMD[i]}\n\n\n\n`)
              // console.log(featureCMD[i])
            }
            for (let i = 0, j = URLList.length; i <= j; i++) {
              let id = 300001 + i
              stream.write(`${packCommand(id)}\n`)
            }
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
      console.log(`${deviceList[1]} connected.`)
      conn2.shell((err, stream) => {
        if (err) throw err
        let message = ''
        const fileNames = ['Hinet清單.csv', 'GSN清單.csv']
        stream
          .on('data', (data) => {
            message += data.toString()
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log(`${deviceList[1]} adding success. Connection closed.`)
            createLog(message, deviceList[1], 'CMDResponse')
            conn2.end()
          })
        ;(async () => {
          let url = []
          let removeCMD = await removeAllSetting(`${deviceList[1]}.txt`)
          for (let i = 0, j = removeCMD.length; i < j; i++) {
            stream.write(`${removeCMD[i]}`)
          }

          for (let i = 0, j = fileNames.length; i < j; i++) {
            url = url.concat(await parseCSV(fileNames[i]))
          }

          let filterCMD = await buildFilterCommand(url, `${deviceList[1]}`)
          for (let i = 0, j = filterCMD.length; i < j; i++) {
            stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
          }

          let featureCMD = await buildFeatureCommand(url)
          for (let i = 0, j = featureCMD.length; i < j; i++) {
            stream.write(`${featureCMD[i]}\n\n\n\n`)
          }

          for (let i = 0, j = url.length; i <= j; i++) {
            let id = 300001 + i
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
