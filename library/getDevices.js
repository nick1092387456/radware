const path = require("path")
require("dotenv").config({
  path: path.resolve(process.cwd(), "./config", ".env"),
})

function validateArray(arr, name) {
  for (let i = 0; i < arr.length; i++) {
    if (!arr[i]) {
      throw new Error(`/config/.env 的 ${name}，在第${i + 1}個項目內容輸入有誤`)
    }
  }
}

function getDevices() {
  try {
    const hosts = process.env.HOST.split(",")
    const users = process.env.USER.split(",")
    const passwords = process.env.PRIVATEKEY.split(",")

    // 檢查空字串
    validateArray(hosts, "HOST")
    validateArray(users, "USER")
    validateArray(passwords, "PRIVATEKEY")

    // 檢查項目數量是否一致，找出項目最少的那個
    const maxLength = hosts.length
    if (users.length < maxLength) {
      throw new Error(`USER 輸入數量需與HOST一致`)
    } else if (passwords.length < maxLength) {
      throw new Error(`PRIVATEKEY 輸入數量需與HOST一致`)
    }

    const devices = []

    // 長度一致，儲存資料進入devices
    for (let i = 0; i < hosts.length; i++) {
      devices.push({
        host: hosts[i],
        user: users[i],
        password: passwords[i],
      })
    }
    return devices
  } catch (error) {
    console.error(`\x1b[31m\x1b[1m${error.message}\x1b[0m`)
  }
}

module.exports = getDevices
