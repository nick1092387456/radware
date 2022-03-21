const path = require('path')
const { Client } = require('ssh2')
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

const device_amount = process.env.HOST.split(',').length
const device_list = process.env.HOST.split(',')
const HOST_LIST = process.env.HOST.split(',')
const USER_LIST = process.env.USER.split(',')
const KEY_LIST = process.env.PRIVATEKEY.split(',')

let removeDeviceList = []
;(async () => {
  removeDeviceList = await checkRemoveListExist()
})()


conn_List = new Array(device_amount)
;(async () => {
  for (let i = device_amount - 1; i >= 0; i--) {
    conn_List[i] = new Client()
    await connectLoop(i)
  }
})()

function connectLoop(index) {
  return new Promise((res) => {
    conn_List[index]
      .on('ready', () => {
        const cli_Processing_Hinter1 = new Spinner()
        console.log(`${device_list[index]} connected`)
        conn_List[index].shell((err, stream) => {
          if (err) {
            console.log(err)
            conn_List[index].end()
          }
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
              createLog(consoleMessage, device_list[index], 'CMDResponse')
              conn_List[index].end(res())
            })
          ;(async () => {
            cli_Processing_Hinter1.spin()
            try {
              const fileNames = await checkCSVexist()
              let idCount = 300001
              let removeCMD = []
              if (removeDeviceList.length) {
                for (let i = 0, j = removeDeviceList.length; i < j; i++) {
                  removeCMD = await removeAllSetting(
                    `${removeDeviceList[i]}.txt`
                  )
                }
                //remove last time added url.
                for (let i = removeCMD.length - 1; i >= 0; i--) {
                  stream.write(`${removeCMD[i]}`)
                  removeDeviceList.pop()
                  // console.log(removeCMD[i])
                }
                //empty previousLog
                createLog('', device_list[index], 'previousLog')
                createLog('', device_list[index], 'dailyLog')
              }

              for (let x = 0, y = fileNames.length; x < y; x++) {
                let filterCMD = []
                let URLList = []
                //parse CSV list to URL
                URLList = URLList.concat(await parseCSV(fileNames[x]))
                //buildFilterCommand
                filterCMD = await buildFilterCommand(
                  URLList,
                  device_list[index],
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
              connectCloseMessage = `${device_list[index]} adding success. Connect closed.`
              stream.write('dp update-policies set 1\nlogout\ny\n')
            } catch (err) {
              console.log(err)
              connectCloseMessage = `${device_list[index]} Connect closed.`
              stream.write('logout\ny\n')
            }
          })()
        })
      })
      .connect({
        host: HOST_LIST[index],
        port: 22,
        username: USER_LIST[index],
        password: KEY_LIST[index],
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
  })
}
