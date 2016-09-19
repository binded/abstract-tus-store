import testStore from '../src'
import initMemStore from '../src/mem-store'

const setup = () => {
  const store = initMemStore()
  return store
}
const teardown = () => {
  // nothing to do...
}

testStore({ setup, teardown })
