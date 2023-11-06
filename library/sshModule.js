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
  }

  executeCommand(device, command) {
    return new Promise((resolve, reject) => {
      this.client.on("error", (err) => {
        if (err.code !== "ECONNRESET") {
          this.client.end()
          reject(err)
        }
      })

      this.client.on("ready", () => {
        this.client.shell((err, stream) => {
          if (err) {
            this.client.end()
            return reject(err)
          }
          let dataBuffer = ""
          stream
            .on("close", () => {
              this.client.end()
              resolve(dataBuffer)
            })
            .on("data", (data) => {
              dataBuffer += data
            })
          stream.write(command + "\n\r")
          stream.end("exit\n\r")
        })
      })

      this.client.connect({
        host: device.host,
        port: 22,
        username: device.user,
        password: device.password,
        algorithms: process.env.TEST_MODE ? undefined : algorithms,
      })
    })
  }
}

module.exports = SSHConnector
