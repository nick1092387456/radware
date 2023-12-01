const { Client } = require("ssh2")
const { createLog } = require("./logger")
const algorithms = {
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
}

class SSHConnector {
  constructor(device) {
    this.client = new Client()
    this.dataBuffer = ""
    this.device = device
    this.lastCheckIndex = 0 // 新增一個變量來記錄上一次檢查的位置
    this.logInterval = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client
        .on("ready", () => {
          resolve()
        })
        .on("error", (err) => {
          reject(err)
        })
        .connect({
          host: this.device.host,
          port: 22,
          username: this.device.user,
          password: this.device.password,
          algorithms: process.env.TEST_MODE === "true" ? undefined : algorithms,
        })
    })
  }

  startShell() {
    return new Promise((resolve, reject) => {
      this.client.shell((err, stream) => {
        if (err) {
          return reject(err)
        }
        this.stream = stream

        stream
          .on("close", () => {
            this.dataBuffer = ""
            this.client.end()
          })
          .on("data", (data) => {
            this.dataBuffer += data
          })
          .stderr.on("data", (data) => {
            createLog(data, this.device.host, "Error")
          })
        resolve()
      })
    })
  }

  sendCommand(command) {
    if (Array.isArray(command)) {
      const commandString = command.join("\r\n")
      this.stream.write(commandString + "\r\n")
    } else {
      this.stream.write(command + "\r\n")
    }
  }

  waitForPrompt(promptString, timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        // 從上一次檢查的位置開始尋找提示字串
        const foundIndex = this.dataBuffer.indexOf(
          promptString,
          this.lastCheckIndex
        )
        if (foundIndex !== -1) {
          clearInterval(checkInterval)
          this.lastCheckIndex = foundIndex + promptString.length // 更新最後檢查的位置
          resolve(true)
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          this.lastCheckIndex = this.dataBuffer.length // 超時則更新最後檢查的位置為當前數據緩衝的終點
          resolve(false)
        }
      }, parseInt(process.env.PROMPT_WAIT_TIME, 10) || 1000)
    })
  }

  getOutputAfterPrompt(promptString) {
    const promptIndex = this.dataBuffer.indexOf(promptString)
    if (promptIndex !== -1) {
      // 返回提示字串後的數據
      return this.dataBuffer.substring(promptIndex + promptString.length)
    }
    // 如果沒有找到提示字串，返回空字符串
    return ""
  }

  endShell() {
    this.stream.end(process.env.PROMPT_EXIT)
  }

  getOutput() {
    return this.dataBuffer
  }
}

module.exports = SSHConnector
