const path = require("path")
require("dotenv").config({
  path: path.resolve(process.cwd(), "./config", ".env"),
})
const {
  genDeleteFeature,
  genDeleteFilter,
  createConn,
  getSameDevice,
  createLog,
  Spinner,
} = require("./library")
const device_list = process.env.HOST.split(",")

// 使用cmdargu的方式指定裝置刪除資料
//V 1.先使用dotenv抓取env內所有裝置設定
// 2.解析cmdargu
// 3.依解析結果抓取裝置設定
// 4.載入裝置設定

let deviceList = []

;(async () => {
  deviceList = await getSameDevice(device_list)
  const deviceAmount = deviceList.length
  if (deviceAmount) {
    await createConn(removeURL, deviceAmount)
  }
})()

async function removeURL(index, connList) {
  const sameEnvIndex = process.env.HOST.split(",").indexOf(deviceList[index])
  const sameEnvHOST = process.env.HOST.split(",")[sameEnvIndex]
  const sameEnvUser = process.env.USER.split(",")[sameEnvIndex]
  const sameEnvKEY = process.env.PRIVATEKEY.split(",")[sameEnvIndex]

  await connList[index].connect({
    host: sameEnvHOST,
    port: 22,
    username: sameEnvUser,
    password: sameEnvKEY,
    algorithms: {
      kex: [
        "diffie-hellman-group1-sha1",
        "ecdh-sha2-nistp256",
        "ecdh-sha2-nistp384",
        "ecdh-sha2-nistp521",
        "diffie-hellman-group-exchange-sha256",
        "diffie-hellman-group14-sha1",
      ],
      cipher: [
        "3des-cbc",
        "aes128-ctr",
        "aes192-ctr",
        "aes256-ctr",
        "aes128-gcm",
        "aes128-gcm@openssh.com",
        "aes256-gcm",
        "aes256-gcm@openssh.com",
      ],
      serverHostKey: [
        "ssh-rsa",
        "ecdsa-sha2-nistp256",
        "ecdsa-sha2-nistp384",
        "ecdsa-sha2-nistp521",
      ],
      hmac: ["hmac-sha2-256", "hmac-sha2-512", "hmac-sha1"],
    },
  })

  await new Promise((res) => {
    connList[index].on("ready", async () => {
      const cli_Processing_Hinter1 = new Spinner()
      connList[index].shell(async (err, stream) => {
        if (err) throw err

        let consoleMessage = ""
        stream.on("data", (data) => {
          consoleMessage += data.toString()
        })

        stream.on("close", async () => {
          cli_Processing_Hinter1.stop()
          await createLog(consoleMessage, deviceList[index], "CMDResponse")
          console.log(`${deviceList[index]} delete completed connection close.`)
          connList[index].end(res())
          console.log("按任意按鍵關閉...")
          process.stdin.once("data", function () {
            process.exit()
          })
        })

        cli_Processing_Hinter1.spin()
        console.log(`${deviceList[index]} connected`)

        const delFeature = genDeleteFeature(`${deviceList[index]}.txt`)
        const delFilter = genDeleteFilter(`${deviceList[index]}.txt`)

        for (let i = 0, j = delFeature.length; i < j; i++) {
          stream.write(`${delFeature[i]}`)
        }

        for (let i = 0, j = delFilter.length; i < j; i++) {
          stream.write(`${delFilter[i]}`)
        }

        stream.write("dp update-policies set 1\nlogout\ny\n")
      })
    })
  })
}
