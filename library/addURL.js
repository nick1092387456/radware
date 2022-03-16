const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
const conn2 = new Client()
require('dotenv').config({
  path: path.resolve(process.cwd(), './config', '.env'),
})
const {
  checkCSVexist,
  checkRemoveListExist,
  parseCSV,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  removeAllSetting,
  createLog,
  Spinner,
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
      const cli_Processing_Hinter1 = new Spinner()
      console.log(`${deviceList[0]} connected`)
      conn.shell((err, stream) => {
        if (err) throw err
        let consoleMessage = ''
        let connectCloseMessage = ''
        stream
          .on('data', (data) => {
            consoleMessage += data.toString()
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log(connectCloseMessage)
            cli_Processing_Hinter1.stop()
            createLog(consoleMessage, deviceList[0], 'CMDResponse')
            conn.end()
          })
        ;(async () => {
          cli_Processing_Hinter1.spin()
          try {
            const fileNames = await checkCSVexist()
            let idCount = 300001
            let removeDeviceListExist = await checkRemoveListExist(
              `${deviceList[0]}.txt`
            )
            if (removeDeviceListExist) {
              let removeCMD = await removeAllSetting(`${deviceList[0]}.txt`)
              //remove last time added url.
              for (let i = 0, j = removeCMD.length; i < j; i++) {
                stream.write(`${removeCMD[i]}`)
                // console.log(removeCMD[i])
              }
            }

            //empty previousLog
            createLog('', deviceList[0], 'previousLog')
            createLog('', deviceList[0], 'dailyLog')

            for (let x = 0, y = fileNames.length; x < y; x++) {
              let filterCMD = []
              let URLList = []
              //parse CSV list to URL
              URLList = URLList.concat(await parseCSV(fileNames[x]))
              //buildFilterCommand
              filterCMD = await buildFilterCommand(
                URLList,
                deviceList[0],
                fileNames[x]
              )

              for (let i = 0, j = filterCMD.length; i < j; i++) {
                stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
                // console.log(filterCMD[i])
              }

              for (let i = 0, j = URLList.length; i < j; i++) {
                let featureCMD = await buildFeatureCommand(
                  URLList[i],
                  fileNames[x],
                  idCount
                )
                stream.write(`${featureCMD}\n\n\n\n`)
                stream.write(`${packCommand(idCount)}\n`)
                // console.log(featureCMD)
                idCount++
              }
            }
            connectCloseMessage = `${deviceList[0]} adding success. Connect closed.`
            stream.write('dp update-policies set 1\nlogout\ny\n')
          } catch (err) {
            console.log(err)
            connectCloseMessage = `${deviceList[0]} Connect closed.`
            stream.write('logout\ny\n')
          }
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
      const cli_Processing_Hinter2 = new Spinner()
      console.log(`${deviceList[1]} connected`)
      conn2.shell((err, stream) => {
        if (err) throw err
        let consoleMessage = ''
        let connectCloseMessage = ''
        stream
          .on('data', (data) => {
            consoleMessage += data.toString()
            // console.log(data.toString())
          })
          .on('close', () => {
            console.log(connectCloseMessage)
            cli_Processing_Hinter2.stop()
            createLog(consoleMessage, deviceList[1], 'CMDResponse')
            conn2.end()
          })
        ;(async () => {
          cli_Processing_Hinter2.spin()
          try {
            const fileNames = await checkCSVexist()
            let idCount = 300001
            let removeDeviceListExist = await checkRemoveListExist(
              `${deviceList[1]}.txt`
            )
            if (removeDeviceListExist) {
              let removeCMD = await removeAllSetting(`${deviceList[1]}.txt`)
              //remove last time added url.
              for (let i = 0, j = removeCMD.length; i < j; i++) {
                stream.write(`${removeCMD[i]}`)
                // console.log(removeCMD[i])
              }
            }

            //empty previousLog
            createLog('', deviceList[1], 'previousLog')
            createLog('', deviceList[1], 'dailyLog')

            for (let x = 0, y = fileNames.length; x < y; x++) {
              let filterCMD = []
              let URLList = []
              //parse CSV list to URL
              URLList = URLList.concat(await parseCSV(fileNames[x]))
              //buildFilterCommand
              filterCMD = await buildFilterCommand(
                URLList,
                deviceList[1],
                fileNames[x]
              )

              for (let i = 0, j = filterCMD.length; i < j; i++) {
                stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
                // console.log(filterCMD[i])
              }

              for (let i = 0, j = URLList.length; i < j; i++) {
                let featureCMD = await buildFeatureCommand(
                  URLList[i],
                  fileNames[x],
                  idCount
                )
                stream.write(`${featureCMD}\n\n\n\n`)
                stream.write(`${packCommand(idCount)}\n`)
                // console.log(featureCMD)
                idCount++
              }
            }
            connectCloseMessage = `${deviceList[1]} adding success. Connect closed.`
            stream.write('dp update-policies set 1\nlogout\ny\n')
          } catch (err) {
            console.log(err)
            connectCloseMessage = `${deviceList[1]} Connect closed.`
            stream.write('logout\ny\n')
          }
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
