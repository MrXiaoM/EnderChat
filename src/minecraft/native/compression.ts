import { NativeModules } from 'react-native'
import zlib from 'zlib'

const { CompressionModule } = NativeModules
const isCompressionModuleAvailable = false
// compressionModule?.compressData && CompressionModule.decompressData

export const compressData = async (data: Buffer): Promise<Buffer> => {
  if (isCompressionModuleAvailable) {
    return CompressionModule.compressData(data.toString('base64')).then(
      (res: string) => Buffer.from(res, 'base64')
    )
  } else return zlib.deflateSync(data)
}

export const decompressData = async (data: Buffer): Promise<Buffer> => {
  if (isCompressionModuleAvailable) {
    return CompressionModule.decompressData(data.toString('base64')).then(
      (res: string) => Buffer.from(res, 'base64')
    )
  } else return zlib.unzipSync(data, { finishFlush: 2 })
}
