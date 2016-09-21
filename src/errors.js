export class StoreError extends Error {}
export class UploadNotFound extends StoreError {}
export class OffsetMismatch extends StoreError {}
export class KeyNotFound extends StoreError {}
export class UploadLocked extends StoreError {}
export default StoreError
