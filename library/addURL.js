const fs = require('fs')
const path = require('path')
const { Client } = require('ssh2')
const conn = new Client()
const dir = path.resolve(__dirname, '../public')
require('dotenv').config({ path: path.resolve(__dirname, '../', '.env') })
const {
  parseCSV,
  buildFilterCommand,
  buildFeatureCommand,
  packCommand,
} = require('./library')

conn
  .on('ready', () => {
    console.log('Client :: ready')
    conn.shell((err, stream) => {
      if (err) throw err
      let result = ''
      stream
        .on('data', (data) => {
          result += data.toString()
          console.log(data.toString())
        })
        .on('close', () => {
          console.log('Stream :: close')
          conn.end()
        })
      fs.readdir(dir, (err, fileNames) => {
        if (err) throw err
        fileNames.forEach((fileName) => {
          ;(async () => {
            let url = await parseCSV(fileName)
            let filterCMD = await buildFilterCommand(url)
            for (let i = 0, j = filterCMD.length; i < j; i++) {
              stream.write(`${filterCMD[i]}\n\n\n\n\n\n\n\n`)
            }

            let featureCMD = await buildFeatureCommand(url)
            for (let i = 0, j = featureCMD.length; i < j; i++) {
              stream.write(`${featureCMD[i]}\n\n\n\n`)
            }

            for (let i = 0, j = url.length; i <= j; i++) {
              let id = 320001 + i
              stream.write(`${packCommand(id)}\n`)
            }

            stream.write('logout\ny\n')
          })()
        })
      })
    })
  })
  .connect({
    host: process.env.HOST,
    port: 22,
    username: process.env.USERNAME.toLocaleLowerCase(),
    password: process.env.PRIVATEKEY,
  })
