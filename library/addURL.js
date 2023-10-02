const path = require("path")
require("dotenv").config({
  path: path.resolve(process.cwd(), "./config", ".env"),
})
const {
  createConn,
  getCSVFile,
  checkRemoveListExist,
  parseCSV,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
  genDeleteFeature,
  genDeleteFilter,
  createLog,
  Spinner,
} = require("./library")
const deviceAmount = process.env.HOST.split(",").length
const device_list = process.env.HOST.split(",")
const HOST_LIST = process.env.HOST.split(",")
const USER_LIST = process.env.USER.split(",")
const KEY_LIST = process.env.PRIVATEKEY.split(",")
console.log("device_list: ", device_list)

let removeDeviceList = []
;(async () => {
  removeDeviceList = await checkRemoveListExist()
  await createConn(addURL, deviceAmount)
})()

async function addURL(index, connList) {
  const conn = connList[index]
  const device = device_list[index]
  try {
    await new Promise((resolve) => {
      conn.on("ready", () => {
        const cli_Processing_Hinter1 = new Spinner()
        console.log(`${device} connected`)
        conn.shell(async (err, stream) => {
          if (err) {
            console.log(err)
            conn.end()
          }
          let consoleMessage = ""
          let connectCloseMessage = ""
          stream
            .on("data", (data) => {
              consoleMessage += data.toString()
            })
            .on("close", async () => {
              console.log(connectCloseMessage)
              cli_Processing_Hinter1.stop()
              console.timeEnd(`${device} process`)
              await createLog(consoleMessage, device, "CMDResponse")
              conn.end()
              console.log("按任意按鍵關閉...")
              process.stdin.once("data", function () {
                process.exit()
              })
            })
          cli_Processing_Hinter1.spin()
          console.time(`${device} process`)
          const fileNames = await getCSVFile()
          let idCount = 300001
          let delFeature = []
          let delFilter = []
          // if (removeDeviceList.length) {
          //   for (let i = 0, j = removeDeviceList.length; i < j; i++) {
          //     delFeature = genDeleteFeature(`${removeDeviceList[i]}.txt`)
          //     delFilter = genDeleteFilter(`${removeDeviceList[i]}.txt`)
          //   }
          //   for (let i = delFeature.length - 1; i >= 0; i--) {
          //     stream.write(`${delFeature[i]}`)
          //   }
          //   for (let i = delFilter.length - 1; i >= 0; i--) {
          //     stream.write(`${delFilter[i]}`)
          //   }
          //   await createLog("", device, "previousLog")
          //   await createLog("", device, "dailyLog")
          //   removeDeviceList.pop()
          // }
          for (let x = 0, y = fileNames.length; x < y; x++) {
            let filterCMD = []
            let URLList = []
            URLList = URLList.concat(await parseCSV(fileNames[x]))
            filterCMD = buildFilterCommand(URLList, device)
            console.log("filterCMD: ", filterCMD)

            for (let i = 0, j = filterCMD.length; i < j; i++) {
              stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n\n`)
            }
            for (let i = 0, j = URLList.length; i < j; i++) {
              let featureCMD = buildFeatureCommand(
                URLList[i],
                fileNames[x],
                idCount
              )
              console.log("featureCMD: ", featureCMD)
              stream.write(`${featureCMD}\n\n\n\n`)
              stream.write(`${packCommand(idCount)}\n`)
              idCount++
            }
          }
          connectCloseMessage = `${device} adding success. Connect closed.`
          stream.write("dp update-policies set 1\nlogout\ny\n")
        })
      })
      conn.connect({
        host: HOST_LIST[index],
        port: 22,
        username: USER_LIST[index],
        password: KEY_LIST[index],
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
  } catch (err) {
    console.log(err)
  }
}
