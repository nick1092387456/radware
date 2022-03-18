const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
require('dotenv').config({
  path: path.resolve(process.cwd(), './config', '.env'),
})
const { removeAllSetting } = require('./library')

const device_amount = process.env.HOST.split(',').length
const HOST_LIST = process.env.HOST.split(',')
const USER_LIST = process.env.USER.split(',')
const KEY_LIST = process.env.PRIVATEKEY.split(',')

// 使用cmdargu的方式指定裝置刪除資料
//V 1.先使用dotenv抓取env內所有裝置設定
// 2.解析cmdargu
// 3.依解析結果抓取裝置設定
// 4.載入裝置設定

const args = process.argv.slice(2)
let executiveSwitch = 0
let deviceIndex = 0
let logFileName = ''

if (process.argv.length === 3) {
  if (HOST_LIST.indexOf(args[0]) !== -1) {
    executiveSwitch = 1
    deviceIndex = HOST_LIST.indexOf(args[0])
    logFileName = `${HOST_LIST[deviceIndex]}.txt`
  }
} else {
  console.log(`請輸入預刪除黑名單的設備".\\removeURL.exe [ip]`)
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
          stream.write('dp update-policies set 1\nlogout\ny\n')
        })()
      })
    })
    .connect({
      host: HOST_LIST[deviceIndex],
      port: 22,
      username: USER_LIST[deviceIndex],
      password: KEY_LIST[deviceIndex],
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
