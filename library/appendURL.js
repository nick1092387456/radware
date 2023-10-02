const readline = require("readline")
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve))
const path = require("path")
require("dotenv").config({
  path: path.resolve(process.cwd(), "./config", ".env"),
})
const {
  parseIdNumber,
  createConn,
  getSameDevice,
  appendLog,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  Spinner,
} = require("./library")
const device_list = process.env.HOST.split(",")

let deviceList = []

;(async () => {
  deviceList = await getSameDevice(device_list)
  let device_amount = deviceList.length
  if (deviceList.length) {
    createConn(appendURL, device_amount)
  }
})()

function appendURL(index) {
  let sameEnvIndex = process.env.HOST.split(",").indexOf(deviceList[index])
  let sameEnvHOST = process.env.HOST.split(",")[sameEnvIndex]
  let sameEnvUser = process.env.USER.split(",")[sameEnvIndex]
  let sameEnvKEY = process.env.PRIVATEKEY.split(",")[sameEnvIndex]
  return new Promise((res) => {
    conn_List[index]
      .on("ready", () => {
        const cli_Processing_Hinter1 = new Spinner()
        console.log(`${deviceList[index]} connected`)
        conn_List[index].shell((err, stream) => {
          if (err) {
            console.log(err)
            conn_List[index].end()
          }
          let consoleMessage = ""
          let connectCloseMessage = ""
          stream
            .on("data", (data) => {
              consoleMessage += data.toString()
            })
            .on("close", () => {
              console.log(connectCloseMessage)
              cli_Processing_Hinter1.stop()
              appendLog(consoleMessage, deviceList[index], "CMDResponse")
              conn_List[index].end(res())
              console.log("按任意按鍵關閉...")
              process.stdin.once("data", function () {
                process.exit()
              })
            })
          ;(async () => {
            try {
              //getIDCount
              let idCount = 300001 + parseIdNumber(deviceList[index]) - 1
              let filterCMD = []
              let URLList = []
              //parse argv
              if (process.argv.slice(2)[0])
                URLList = process.argv.slice(2)[0].split(",")
              else {
                URLList = (
                  await prompt("請輸入Domain並以逗號區分每項:\n")
                ).split(",")
              }
              cli_Processing_Hinter1.spin()
              //buildFilterCommand
              filterCMD = await buildFilterCommand(
                URLList,
                deviceList[index],
                "Append"
              )

              for (let i = 0, j = filterCMD.length; i < j; i++) {
                stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
              }

              for (let i = 0, j = URLList.length; i < j; i++) {
                let featureCMD = await buildFeatureCommand(
                  URLList[i],
                  "Append",
                  idCount
                )
                stream.write(`${featureCMD}\n\n\n\n`)
                stream.write(`${packCommand(idCount)}\n`)
                idCount++
              }

              connectCloseMessage = `${deviceList[index]} adding success. Connect closed.`
              stream.write("dp update-policies set 1\nlogout\ny\n")
            } catch (err) {
              console.log(err)
              connectCloseMessage = `${deviceList[index]} Connect closed.`
              stream.write("logout\ny\n")
            }
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
  })
}
