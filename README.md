# abstract-tus-store

[![Build Status](https://travis-ci.org/blockai/abstract-tus-store.svg?branch=master)](https://travis-ci.org/blockai/abstract-tus-store)

WIP!

Blackbox test suite for tus store implementations. Inspired by
[abstract-blob-store](https://github.com/maxogden/abstract-blob-store).

## Install

```bash
npm install --save-dev abstract-tus-store
```

Requires Node v6+

## Usage

See [./test](./test) directory for usage example.

In your tests:

```javascript
import testStore from 'abstract-tus-store'
import memStore from 'abstract-tus-store/mem-store'

testStore({
  setup() {
    // Return your store instance (promise supported)
    return memStore()
  }

  teardown() {
    // you can use this hook to clean up, e.g. remove
    // a temp directory
  }
})
```