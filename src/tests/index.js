import test from 'blue-tape'
import str from 'string-to-stream'
import concat from 'concat-stream'
import { RandomStream } from 'common-streams'

// TODO: make sure partial uploads are not visiable through createReadStream
//
// TODO: add a test to make sure .write() doesn't miss out on bytes
// if readstream is already piped somewhere

const noop = async () => {}

export default ({
  setup = noop,
  teardown = noop,
} = {}) => {
  let store
  let minPartSize

  test('setup', async (t) => {
    store = await setup(t)
    if (!store.minChunkSize) {
      // Let's use a small minPartSize to make sure the store isn't lying!
      minPartSize = 2
    } else {
      minPartSize = store.minChunkSize
    }
    t.comment(`testing with minPartSize = ${minPartSize}`)
  })

  test('info - unknown upload', async (t) => {
    try {
      await store.info('unknown-upload')
      t.fail('expected error to be thrown')
    } catch (err) {
      t.ok(err instanceof Error)
    }
  })

  // memorise upload IDs
  let fooUploadId
  let otherUploadId

  test('create foo (minPartSize + 1)', async () => {
    const uploadLength = minPartSize + 1
    const { uploadId } = await store.create('foo', { uploadLength })
    fooUploadId = uploadId
  })

  // We will use this later to overwrite key
  test('create another upload for same key', async (t) => {
    const uploadLength = 'bar'.length
    const { uploadId } = await store.create('foo', {
      uploadLength,
      metadata: { bar: 'foo', contentType: 'text/plain' },
    })
    t.notEqual(fooUploadId, uploadId)
    otherUploadId = uploadId
  })

  test('info after create', async (t) => {
    // TODO: test metadata
    const { offset, key, uploadLength } = await store.info(fooUploadId)
    t.equal(offset, 0)
    t.equal(uploadLength, minPartSize + 1)
    t.equal(key, 'foo')
  })

  // remember written data for later compare
  const randomChunks = []
  test('append random data (minPartSize bytes)', async (t) => {
    const rand = new RandomStream(minPartSize)
    rand.pipe(concat((chunk) => { randomChunks.push(chunk) }))
    const { offset } = await store.append(fooUploadId, rand, 0)
    t.equal(offset, minPartSize)
  })

  test('info after first append', async (t) => {
    const { offset, uploadLength } = await store.info(fooUploadId)
    t.equal(offset, minPartSize)
    t.equal(uploadLength, minPartSize + 1)
  })

  test('wrong offset passed to append', async (t) => {
    try {
      await store.append(fooUploadId, str('woot'), 1)
      t.fail('expected an error to be thrown')
    } catch (err) {
      t.ok(err instanceof Error)
    }
  })

  test('append last byte (!)', async (t) => {
    randomChunks.push(Buffer.from('!'))
    const { upload, offset } = await store.append(fooUploadId, str('!'))
    t.equal(upload.uploadLength, minPartSize + 1)
    t.equal(offset, minPartSize + 1)
    t.equal(upload.offset, minPartSize + 1)
  })

  test('info after upload complete', async (t) => {
    const { offset, uploadLength } = await store.info(fooUploadId)
    t.equal(offset, minPartSize + 1)
    t.equal(uploadLength, minPartSize + 1)
  })

  // make sure writes succeeded...
  test('readStream foo', (t) => {
    // TODO: test metadata?
    store.createReadStream('foo')
      .on('error', t.error)
      .pipe(concat((buf) => {
        t.deepEqual(buf, Buffer.concat(randomChunks))
        t.end()
      }))
  })

  test('finish second upload', async () => {
    await store.append(otherUploadId, str('bar'))
  })

  test('readStream foo after second upload finished', (t) => {
    // TODO: test metadata?
    store.createReadStream('foo')
      .on('error', t.error)
      .pipe(concat((buf) => {
        t.deepEqual(buf.toString(), 'bar')
        t.end()
      }))
  })

  test('readStream onInfo callback', (t) => {
    // TODO: test metadata?
    const rs = store.createReadStream('foo', ({ contentLength, metadata }) => {
      t.equal(contentLength, 3)
      t.deepEqual(metadata, { bar: 'foo', contentType: 'text/plain' })
      rs.pipe(concat((buf) => {
        t.deepEqual(buf.toString(), 'bar')
        t.end()
      }))
    })
    .on('error', t.error)
  })

  test('non latin chars in metadata', async (t) => {
    const uploadLength = 'bar'.length
    const nonlatin = 'słońce'
    const { uploadId } = await store.create('foo', {
      uploadLength,
      metadata: { nonlatin },
    })
    const { metadata } = await store.info(uploadId)
    t.equal(metadata.nonlatin, nonlatin)
  })

  test('beforeComplete is called', async (t) => {
    const uploadLength = 'woot'.length
    const { uploadId } = await store.create('foo', {
      uploadLength,
      metadata: {
        somekey: 'someval',
      },
    })
    try {
      await store.append(uploadId, str('woot'), {
        beforeComplete: (beforeInfo, beforeUploadId) => {
          t.deepEqual(beforeUploadId, uploadId)
          t.deepEqual(beforeInfo.uploadLength, uploadLength)
          t.deepEqual(beforeInfo.metadata, {
            somekey: 'someval',
          })
          throw new Error('stop!')
        },
      })
      throw new Error('should have thrown')
    } catch (err) {
      t.equal(err.message, 'stop!')
      const rs = store.createReadStream('foo')
      const data = await new Promise((resolve) => {
        rs.pipe(concat((buf) => {
          resolve(buf)
        }))
      })
      t.equal(data.toString(), 'bar')
      await store.append(uploadId, str(''))
      const dataAfterComplete = await new Promise((resolve) => {
        store.createReadStream('foo').pipe(concat((buf) => {
          resolve(buf)
        }))
      })
      t.equal(dataAfterComplete.toString(), 'woot')
    }
  })

  // TODO: test non ascii characters in metadata
  // TODO: test keys with multiple / chars...

  test('teardown', async (t) => teardown(t, store))
}
