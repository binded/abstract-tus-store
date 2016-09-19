import pump from 'pump'
import { Writable, Readable } from 'stream'

export default () => {
  const map = new Map()

  const create = (key, { uploadLength, uploadMetadata } = {}) => (
    Promise.resolve().then(() => {
      map.set(key, {
        info: { uploadLength, uploadMetadata },
        data: new Buffer([]),
      })
    })
  )

  const info = key => Promise.resolve().then(() => {
    if (!map.has(key)) throw new Error('unknown key')
    return {
      ...map.get(key).info,
      uploadOffset: map.get(key).data.length,
    }
  })

  const write = (key, rs) => new Promise((resolve, reject) => {
    // TODO: lock key?
    const data = map.get(key).data
    const chunks = [data]
    const ws = new Writable({
      write(chunk, encoding, cb) {
        chunks.push(chunk)
        cb()
      },
    })
    pump(rs, ws, (err) => {
      // should try to write as many bytes as possible even if error
      map.get(key).data = Buffer.concat(chunks)
      if (err) return reject(err)
      resolve()
    })
  })

  const createReadStream = (key) => (
    new Readable({
      read() {
        this.push(map.get(key).data)
        this.push(null)
      },
    })
  )

  return {
    info,
    create,
    write,
    createReadStream,
  }
}
