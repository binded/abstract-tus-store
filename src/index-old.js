// THIS TEST FILE DOES NOT RESPECT THE STORE MINPARTSIZE CONFIGURATION!
// (OBSOLETE) OR JUST ENABLE THOSE TESTS FOR STORES THAT DONT HAVE MINPARTSIZE

import test from 'blue-tape'
import str from 'string-to-stream'
import concat from 'concat-stream'

// TODO: make sure partial uploads are not visiable through createReadStream
// TODO: remove { size } hint

const noop = () => Promise.resolve()

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

  test('info - foo- unknown key', (t) => {
    store
      .info('foo')
      .catch((err) => {
        t.ok(err instanceof Error)
        t.end()
      })
  })

  test('create foo', () => (
    store
      .create('foo', { uploadLength: 'bar'.length })
  ))

  test('info foo', (t) => (
    store
      .info('foo')
      .then(({ uploadOffset, uploadLength }) => {
        t.equal(uploadOffset, 0)
        t.equal(uploadLength, 3)
      })
  ))

  test('write ba to foo (with size)', () => (
    store
      .write('foo', str('ba'), { size: 2 })
  ))

  test('info foo', (t) => (
    store
      .info('foo')
      .then(({ uploadOffset, uploadLength }) => {
        t.equal(uploadOffset, 2)
        t.equal(uploadLength, 3)
      })
  ))

  test('write r to foo (with size)', () => (
    store.write('foo', str('r'), { size: 1 })
  ))

  test('info foo', (t) => (
    store
      .info('foo')
      .then(({ uploadOffset, uploadLength }) => {
        t.equal(uploadOffset, 3)
        t.equal(uploadLength, 3)
      })
  ))

  // make sure writes succeeded...
  test('readStream foo', (t) => {
    store
      .createReadStream('foo')
      .on('error', t.error)
      .pipe(concat((buf) => {
        t.equal(buf.toString(), 'bar')
        t.end()
      }))
  })

  test('teardown', (t) => Promise.resolve()
    .then(() => teardown(t, store))
  )
}
