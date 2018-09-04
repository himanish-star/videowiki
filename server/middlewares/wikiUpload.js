import fs from 'fs'
import wikiUpload from '../utils/wikiUploadUtils'
import path from 'path'
import mimetypes from 'mime-types'
import async from 'async'

const ALLOWED_VIDEO_FORMATS = [
  'webm',
]

export const uploadFileToWikiCommons = (req, res, next) => {
  const {
    fileTitle,
    description,
    categories,
    licence,
    source,
    sourceUrl,
    sourceAuthors,
    date,
    duration,
  } = req.body
  let { file } = req.body
  let fileMime
  let errors = []

  file = fs.createReadStream(path.join(__dirname, '../../public', file))

  if (!fileTitle) {
    errors.push('File title is required')
  }
  if (!description) {
    errors.push('Description is required')
  }
  if (!categories || categories.length === 0) {
    errors.push('At least one category is required')
  }
  if (!source) {
    errors.push('Source field is required')
  }
  if (!date) {
    errors.push('Date field is required')
  }
  if (!licence) {
    errors.push('Licence field is required')
  }
  if (source && source === 'others' && !sourceUrl) {
    errors.push('Please specify the source of the file')
  }
  if (file) {
    fileMime = mimetypes.lookup(file.path)
    if ((fileMime.indexOf('video') > -1 || fileMime.indexOf('gif') > -1) && (!duration || duration == 0)) {
      errors.push('Duration field is required for videos and gifs')
    }
  }
  console.log('uploading to wiki', req.body)
  if (errors.length > 0) {
    console.log(errors)
    return res.status(500).send(errors.join(', '))
  }

  if (file) {
    const uploadFuncArray = []
    if (fileMime.indexOf('video') > -1 && ALLOWED_VIDEO_FORMATS.indexOf(path.extname(file.path).replace('.', '')) === -1) {
      // convert file
      uploadFuncArray.push((cb) => {
        console.log('converting file ', file.path)
        wikiUpload.convertVideoToFormat(file.path, 'webm', (err, filepath) => {
          if (file.path !== filepath) {
            file = fs.createReadStream(filepath)
          }
          cb()
        })
      })
    }

    uploadFuncArray.push(() => {

      console.log(file, 'starting upload')
      // upload file to mediawiki
      wikiUpload.uploadFileToMediawiki(file, { filename: fileTitle, text: `${description} ${categories}` }, (err, result) => {
        if (result && result.result === 'Success') {
          // update file licencing data
          req.file = {
            location: fileMime.indexOf('video') > -1 ? result.imageinfo.url : wikiUpload.getImageThumbnail(result.imageinfo.url, '400px'),
            mimetype: fileMime,
          }
          console.log('uploaded')

          const wikiFileName = `File:${result.filename}`
          const licenceInfo = licence === 'none' ? 'none' : `{{${licence}}}`
          wikiUpload.createWikiArticleSection(wikiFileName, '=={{int:license-header}}==', licenceInfo, () => {
            // update file description
            // TODO handle duration
            const fileDescription = `
              {{Information
                |description=${description}
                |date=${date}
                |source=${source === 'own' ? `{{${source}}}` : sourceUrl}
                |author=${sourceAuthors}
                ${(fileMime.indexOf('video') > -1 || fileMime.indexOf('gif') > -1) ? `|duration=${duration}` : ''}
                }}
              `
            wikiUpload.createWikiArticleSection(wikiFileName, '== {{int:filedesc}} ==', fileDescription)
              .then(() => {
                next()
              })
              .catch((err) => {
                console.log('error updating desc', err)
                res.status(500).send('Error')
              })
          })
        } else {
          const reason = err && err.code && err.info ? `Error [${err.code}]: ${err.info}` : 'Something went wrong';
          console.log(err, reason)
          return res.status(500).send(reason)
        }
      })
    })

    async.series(uploadFuncArray, (err, result) => {
      console.log(err, result)
    })
  } else {
    return res.status(500).send('Error while uploading file')
  }
}
