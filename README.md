# abstract-tus-store

[![Build Status](https://travis-ci.org/blockai/abstract-tus-store.svg?branch=master)](https://travis-ci.org/blockai/abstract-tus-store)

Black box test suite and interface specification for [Tus](https://tus.io)-like stores.
Inspired by [abstract-blob-store](https://github.com/maxogden/abstract-blob-store).

WIP!

Tus stores implement an API for creating and writing sequentially to
"upload resources".

The required interface consists of 4 functions:

  - `create(key[, opts])` creates a new upload resource
  - `info(uploadId)` returns the current size, final key, size and metadata of an upload resource
  - `append(uploadId, readStream, [offset,] [opts])` to append to an upload resource
  - `createReadStream(key)` creates a readable stream for the key
      (primarily used to test implementation)

Optional interface:

  - `createPartial([opts])` to create a new "partial" upload resource
  - `concat(key, uploadIds, [opts])` concatenate "partial" upload resources to key
  - `del(uploadId)` delete an upload resource to free up resources
  - `minChunkSize` optional property that announces the minimal amount of
      bytes to write in an append call (except for the last one)

## Some modules that use this

- [s3-tus-store](https://github.com/blockai/s3-tus-store)
- [fs-tus-store](https://github.com/blockai/fs-tus-store)

Send a PR adding yours if you write a new one.

## Badge

Include this badge in your readme if you make a new module that uses the `abstract-tus-store` API:

[![tus-store-compatible](badge.png)](https://github.com/blockai/abstract-tus-store)

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

## API

This documentation is mainly targeted at implementers.

General notes:

* All functions must return promises
* Error classes are available as keys on an `errors` object exported by `abstract-tus-store`, e.g.

   ```javascript
   import { errors } from 'abstract-tus-store'
   new errors.UnknownKey('some unknown key')
   ```

Some terminology and definitions:

* A *key* represents the final destination (in the store) of an *upload
    resource*'s content and metadata (once the upload is *complete*).
  * Keys should be used "as is" to ensure interoperability with
      other libraries and external systems. For example, an AWS S3 store
      should use the *key* directly as the S3 key.
* An *upload resource*
  * represents an upload in progress;
  * is linked to exactly one or zero keys (for *partial uploads*);
* A *deferred upload* is an upload resource which hasn't been assigned
    an *upload length* yet.
* A *partial upload* is an upload with no linked key.
* An *upload length* is the total expected size of an upload resource
    (e.g. the size of a file to upload).
* An *offset* represents how many bytes have been written to an upload
    resource (so far).
* An upload resource is *complete* when its offset reaches its
    upload length.
* An *upload ID* uniquely identities an upload resource
  * Upload IDs should be unique and unpredictable so that library users
      can send/receive them directly to/from untrusted systems.

### create(key[, opts])

Create a new upload resource that will be stored at `key` once
completed.

* `key`: **String** **required** location of the content and metadata of
    the completed upload resource
* `opts.uploadLength`: **Number** expected size of the upload in bytes
* `opts.metadata`: **Object** arbitrary map of key/values

Must resolve to an object with the following properties:

* `uploadId`: **String** **required** unique, unpredictable identifier for
    the created upload resource

If `opts.uploadLength` is not supplied, it must be passed to a
subsequent call to `append` or else the upload will never complete.

Calls to create should always return a new and unique upload ID.

### info(uploadId)

Get the `offset` and `uploadLength` of an upload resource.

* `uploadId`: **String** **required** a known upload ID
* `key`: **String** **required** the final destination of the completed
		upload

Must resolve to an object with the following properties:

* `offset`: **Number** **required** offset of the upload resource. Must be
    present even if the offset is 0 or the upload is already completed.
* `uploadLength`: **Number** (required if known) upload length of the
    upload resource.
* `metadata`: **Object** metadata that was set at creation.
* `isPartial`: **Boolean** `true` if partial upload

Must throw an `UploadNotFound` error if the upload resource does not
exist.  Must not attempt to create the upload resource if it does not
already exist.

### append(uploadId, data, [offset,] [opts])

Append data to an upload resource.

* `uploadId`: **String** **required** a known Upload ID
* `data`: **Readable Stream** **required** Data that will be appended to the upload resource.
* `offset`: **Number** Optional offset to help prevent data corruption.
* `opts.uploadLength`: **Number** Used to set the length of a
    deferred upload.

Resolves to an object with the following properties:

* `offset`: **Number** **required** the new offset of the upload

Data must be read and written to the upload resource until the data
stream ends or the upload completes (`offset === uploadLength`).

The optional `offset` parameter can be used to prevent data corruption.
Let's say you want to continue uploading a file. You get the current
offset of the upload with a call to `info`, and then call `append` with
a read stream that starts reading the file from `offset`. If `offset`
has changed between your call to `read` and `append`, `append` will
throw an `OffsetMismatch` error.

If the call to `append` causes the upload resource to complete, `append`
must not resolve until the upload resource's content and metadata become
available on its linked key (except for partial uploads which do not
have a key). If an object already exists at said key, it must be
overwritten.

Must throw an `OffsetMismatch` error if the supplied offset is
incorrect.

Must throw an `UploadNotFound` error if the upload doesn't exist.

### createReadStream(key[, onMetadata])

Creates a readable stream to read the key's content from the backing
store. This is mostly used for testing implementations.

* `key`: **String** **required** key to read from the store
* `onMetadata`: **Function** optional callback that will be called with
    the key's metadata

## Optional APIs

TODO...

- `createPartial(opts)` to create a new "partial" upload resource
- `concat(key, uploadIds, [opts])` concatenate "partial" upload resources to key
- `del(uploadId)` delete an upload resource to free up resources
- `minChunkSize` optional property that announces the minimal amount of
    bytes that must be written in an append call (except for the last one)
