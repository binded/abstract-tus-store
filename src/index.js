import test from 'blue-tape'
import str from 'string-to-stream'
import concat from 'concat-stream'
import { RandomStream } from 'common-streams'

// TODO: make sure partial uploads are not visiable through createReadStream

const noop = () => Promise.resolve()

// Default to 2
const minPartSize = (store) => {
  if (typeof store.minPartSize === 'undefined') return 2
  return store.minPartSize
}

export default ({
  setup = noop,
  teardown = noop,
} = {}) => {
  let store

  test('setup', (t) => Promise.resolve()
    .then(() => setup(t))
    .then((s) => { store = s })
  )

  test('info - unknown key', (t) => {
    store
      .info('unknown-key')
      .catch((err) => {
        t.ok(err instanceof Error)
        t.end()
      })
  })

  test('info (foo) - unknown key', (t) => {
    store
      .info('foo')
      .catch((err) => {
        t.ok(err instanceof Error)
        t.end()
      })
  })

  test('create foo (minPartSize + 1)', () => (
    store
      .create('foo', { uploadLength: minPartSize(store) + 1 })
  ))

  test('info foo', (t) => (
    store
      .info('foo')
      .then(({ uploadOffset, uploadLength }) => {
        t.equal(uploadOffset, 0)
        t.equal(uploadLength, minPartSize(store) + 1)
      })
  ))

  const randomChunks = []
  test('write random data (minPartSize bytes) to foo', () => {
    const rand = new RandomStream(minPartSize(store))
    rand.pipe(concat((chunk) => { randomChunks.push(chunk) }))
    return store.write('foo', rand)
  })

  test('info foo', (t) => (
    store
      .info('foo')
      .then(({ uploadOffset, uploadLength }) => {
        t.equal(uploadOffset, minPartSize(store))
        t.equal(uploadLength, minPartSize(store) + 1)
      })
  ))

  test('write ! to foo', () => {
    randomChunks.push(Buffer.from('!'))
    return store.write('foo', str('!'))
  })

  test('info foo', (t) => (
    store
      .info('foo')
      .then(({ uploadOffset, uploadLength }) => {
        t.equal(uploadOffset, minPartSize(store) + 1)
        t.equal(uploadLength, minPartSize(store) + 1)
      })
  ))

  // make sure writes succeeded...
  test('readStream foo', (t) => {
    store
      .createReadStream('foo')
      .on('error', t.error)
      .pipe(concat((buf) => {
        t.deepEqual(buf, Buffer.concat(randomChunks))
        t.end()
      }))
  })

  test('teardown', (t) => Promise.resolve()
    .then(() => teardown(t, store))
  )
}
