const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
require('dotenv').config({
  path: path.resolve(process.cwd(), './config', '.env'),
})
const {
  removeAllSetting,
  createConn,
  getSameDevice,
  Spinner,
} = require('./library')

const device_amount = process.env.HOST.split(',').length
const HOST_LIST = process.env.HOST.split(',')
const USER_LIST = process.env.USER.split(',')
const KEY_LIST = process.env.PRIVATEKEY.split(',')

// 使用cmdargu的方式指定裝置刪除資料
//V 1.先使用dotenv抓取env內所有裝置設定
// 2.解析cmdargu
// 3.依解析結果抓取裝置設定
// 4.載入裝置設定

let device_list = []

;(async () => {
  device_list = await getSameDevice()
  let device_amount = device_list.length
  if (device_list.length) {
    createConn(removeURL, device_amount)
  }
})()

function removeURL(index) {
  return new Promise((res) => {
    let sameEnvIndex = process.env.HOST.split(',').indexOf(device_list[index])
    let sameEnvHOST = process.env.HOST.split(',')[sameEnvIndex]
    let sameEnvUser = process.env.USER.split(',')[sameEnvIndex]
    let sameEnvKEY = process.env.PRIVATEKEY.split(',')[sameEnvIndex]
    conn_List[index]
      .on('ready', () => {
        const cli_Processing_Hinter1 = new Spinner()
        conn_List[index].shell((err, stream) => {
          if (err) throw err
          stream
            .on('data', (data) => {})
            .on('close', () => {
              cli_Processing_Hinter1.stop()
              console.log(`${device_list[index]} delete completed connection close.`)
              conn_List[index].end(res())
            })
          ;(async () => {
            cli_Processing_Hinter1.spin()
            let removeCMD = await removeAllSetting(`${device_list[index]}.txt`)
            console.log(`${device_list[index]} connected`)
            for (let i = 0, j = removeCMD.length; i < j; i++) {
              stream.write(`${removeCMD[i]}`)
            }
            stream.write('dp update-policies set 1\nlogout\ny\n')
          })()
        })
      })
      .connect({
        host: sameEnvHOST,
        port: 22,
        username: sameEnvUser,
        password: sameEnvKEY,
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
