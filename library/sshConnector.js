const { Client } = require("ssh2")

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
  constructor() {
    this.client = new Client()
    this.dataBuffer = ""
  }

  connect(device) {
    return new Promise((resolve, reject) => {
      this.client
        .on("ready", () => {
          resolve()
        })
        .on("error", (err) => {
          reject(err)
        })
        .connect({
          host: device.host,
          port: 22,
          username: device.user,
          password: device.password,
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
            this.client.end()
          })
          .on("data", (data) => {
            this.dataBuffer += data
          })
          .stderr.on("data", (data) => {
            this.dataBuffer += data
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

  waitForPrompt(promptString) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.dataBuffer.includes(promptString)) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 1000)
    })
  }

  endShell() {
    this.stream.end(process.env.PROMPT_EXIT)
  }

  getOutput() {
    return this.dataBuffer
  }
}

module.exports = SSHConnector
