import Plugin from './Plugin'
import tus from 'tus-js-client'

/**
 * Tus resumable file uploader
 *
 */
export default class Tus10 extends Plugin {
  constructor (core, opts) {
    super(core, opts)
    this.type = 'uploader'
    this.id = 'Tus'
    this.title = 'Tus'

    // set default options
    const defaultOptions = {}

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)
  }

/**
 * Create a new Tus upload
 *
 * @param {object} file for use with upload
 * @param {integer} current file in a queue
 * @param {integer} total number of files in a queue
 * @returns {Promise}
 */
  upload (file, current, total) {
    this.core.log(`uploading ${current} of ${total}`)

    // Create a new tus upload
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file.data, {

        // TODO merge this.opts or this.opts.tus here
        resume: false,
        endpoint: this.opts.endpoint,
        onError: (error) => {
          reject('Failed because: ' + error)
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          // Dispatch progress event
          this.core.emitter.emit('upload-progress', {
            uploader: this,
            id: file.id,
            bytesUploaded: bytesUploaded,
            bytesTotal: bytesTotal
          })
        },
        onSuccess: () => {
          file.uploadURL = upload.url
          this.core.emitter.emit('upload-success', file)

          this.core.log(`Download ${upload.file.name} from ${upload.url}`)
          resolve(upload)
        }
      })
      this.core.emitter.on('file-remove', (fileID) => {
        if (fileID === file.id) {
          upload.abort()
        }
      })
      upload.start()
    })
  }

  uploadRemote (file, current, total) {
    console.log('here we go')
    return new Promise((resolve, reject) => {
      console.log(file.remote.url)
      fetch(file.remote.url, {
        method: 'post',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.assign({}, file.remote.body, {
          target: this.opts.endpoint
        }))
      })
      .then((res) => {
        if (res.status >= 200 && res.status <= 300) {
          this.core.log(`Remote upload of '${file.name}' successful`)
          return resolve('Success')
        }
        this.core.log(`Remote upload of file '${file.name}' failed`)

        if (file.acquiredBy.handleError) {
          file.acquiredBy.handleError(res)
        }

        return reject(new Error('Error: ' + res.statusText))
      })
    })
  }

  uploadFiles (files) {
    const uploaders = []
    files.forEach((file, index) => {
      const current = parseInt(index, 10) + 1
      const total = files.length

      if (!file.isRemote) {
        uploaders.push(this.upload(file, current, total))
      } else {
        uploaders.push(this.uploadRemote(file, current, total))
      }
    })

    return Promise.all(uploaders).then(() => {
      return {
        uploadedCount: files.length
      }
    })
  }

  selectForUpload (files) {
    // TODO: replace files[file].isRemote with some logic
    //
    // filter files that are now yet being uploaded / haven’t been uploaded
    // and remote too
    const filesForUpload = Object.keys(files).filter((file) => {
      if (files[file].progress === 0 || files[file].isRemote) {
        return true
      }
      return false
    }).map((file) => {
      return files[file]
    })

    this.uploadFiles(filesForUpload)
  }

  install () {
    this.core.emitter.on('next', () => {
      this.core.log('Tus is uploading...')
      const files = this.core.state.files
      this.selectForUpload(files)
    })
  }
}
