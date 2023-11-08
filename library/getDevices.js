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

// 新增的函數來檢查重複的HOST值
function checkDuplicates(arr, name) {
  const seen = new Set()
  arr.forEach((e, i) => {
    if (seen.has(e)) {
      throw new Error(`/config/.env 的 ${name} 在第${i + 1}個項目是重複的`)
    }
    seen.add(e)
  })
}

function getDevices() {
  try {
    const hosts = process.env.HOST.split(",")
    const users = process.env.USERS.split(",")
    const passwords = process.env.PRIVATEKEY.split(",")

    // 檢查空字串
    validateArray(hosts, "HOST")
    validateArray(users, "USERS")
    validateArray(passwords, "PRIVATEKEY")

    // 檢查HOST是否有重複的值
    checkDuplicates(hosts, "HOST")

    // 檢查項目數量是否一致，找出項目最少的那個
    const maxLength = hosts.length
    if (users.length !== maxLength) {
      throw new Error(`USERS 輸入數量需與HOST一致`)
    } else if (passwords.length !== maxLength) {
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
    console.log(`\x1b[31m\x1b[1m${error.message}\x1b[0m`)
    return []
  }
}

module.exports = getDevices
