const request = require('superagent');
const fs = require('fs');
const mimetypes = require('mime-types');
const wikiUpload = require('../../utils/wikiUploadUtils');
const async = require('async');
const User = require('../../models/User');
const baseUrl = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'svg', 'svg+xml'];

const ALLOWED_VIDEOS_FORMATS = ['ogv', 'webm'];
const ALLOWED_VIDEOS_MIMES = ['video/webm', 'application/ogg'];

const VIDEOS_TRANSCODE_FORMATS = [
  ['480p', 'vp9'],
  ['480p', 'webm'],
  ['360p', 'vp9'],
  ['360p', 'webm'],
  ['240p', 'vp9'],
  ['240p', 'webm'],
  ['120p', 'vp9'],
  ['120p', 'webm'],
]

const fetchImagesFromCommons = function (searchTerm, callback) {
  const url = `${baseUrl}?action=query&generator=search&gsrnamespace=0|6&gsrsearch="${searchTerm}"&gsrlimit=50&prop=imageinfo&iiprop=url|mime|thumbmime&iiurlwidth=400px&format=json`
  // const url = `${baseUrl}?action=query&list=allimages&ailimit=20&aifrom="${searchTerm}"&aiprop=url&format=json&formatversion=2`

  const options = {
    url
  }

  request.get(url)
    .then(response => {
      let responseBody;
      try {
        responseBody = JSON.parse(response.text);
      } catch (e) {
        console.log(e);
      }

      let images = [];
      // parse response content 
      if (responseBody && responseBody.query && responseBody.query.pages) {
        Object.keys(responseBody.query.pages).forEach(pageId => {
          let page = responseBody.query.pages[pageId.toString()];
          // filter only allowed images formats
          if (page.imageinfo && page.imageinfo.length > 0 && page.imageinfo[0].mime && ALLOWED_IMAGE_FORMATS.indexOf(page.imageinfo[0].mime.split('/')[1]) > -1) {
            images.push(page.imageinfo[0]);
          }
        })
      }

      // replace images url with thumb urls, if exists
      images.forEach(image => {
        if (image && image.thumburl) {
          image.url = image.thumburl;
        }
      })
      console.log(images)
      callback(null, images);

    })
    .catch(err => callback(err));
}

const fetchGifsFromCommons = function (searchTerm, callback) {
  const url = `${baseUrl}?action=query&generator=search&gsrnamespace=0|6&gsrsearch=/^${searchTerm} .*gif$/&gsrlimit=50&prop=imageinfo&iiprop=url|mime&iiurlwidth=400px&format=json`;

  const options = {
    url
  }

  request.get(url)
    .then(response => {
      let responseBody;
      try {
        responseBody = JSON.parse(response.text);
      } catch (e) {
        console.log(e);
      }

      let gifs = [];

      // parse response content
      if (responseBody && responseBody.query && responseBody.query.pages) {
        Object.keys(responseBody.query.pages).forEach(pageId => {
          let page = responseBody.query.pages[pageId.toString()];
          // include only returned GIF files
          if (page.imageinfo && page.imageinfo.length > 0 && page.imageinfo[0].mime && page.imageinfo[0].mime.indexOf('gif') > -1) {
            gifs.push(page.imageinfo[0]);
          }
        })
      }

      callback(null, gifs);
    })
    .catch(err => callback(err));
}

const fetchVideosFromCommons = function (searchTerm, callback) {
  let searchFunctionsArray = [];
  let filesUrls = [];

  ALLOWED_VIDEOS_FORMATS.forEach(fileFormat => {
    let formatSearch = new Promise((resolve, reject) => {

      const url = `${baseUrl}?action=query&generator=search&gsrnamespace=0|6&gsrsearch=/^${searchTerm} .*${fileFormat}$/&gsrlimit=20&prop=imageinfo&iiprop=url|mime&format=json`;

      const options = {
        url
      }

      request.get(url)
        .then(response => {
          let responseBody;
          try {
            responseBody = JSON.parse(response.text);
          } catch (e) {
            console.log(e);
          }

          let videos = [];

          // parse response content
          if (responseBody && responseBody.query && responseBody.query.pages) {

            Object.keys(responseBody.query.pages).forEach(pageId => {
              let page = responseBody.query.pages[pageId.toString()];
              // include only returned GIF files
              if (page.imageinfo && page.imageinfo.length > 0 &&
                page.imageinfo[0].mime && ALLOWED_VIDEOS_MIMES.indexOf(page.imageinfo[0].mime) > -1 &&
                filesUrls.indexOf(page.imageinfo[0].url) == -1

              ) {
                videos.push(page.imageinfo[0]);
              }
            })
          }
          // callback(null, videos);
          resolve(videos);
        })
        .catch(err => resolve([]));
    })

    searchFunctionsArray.push(formatSearch);
  })

  Promise.all(searchFunctionsArray)
    .then(videos => {
      if (videos && videos.length > 0) {
        videos = videos.reduce((total, current) => [...total, ...current], [])
      }
      callback(null, videos);
    })
    .catch(err => {
      console.log(err);
      callback(null, []);
    })
}

const fetchCategoriesFromCommons = function (searchTerm, callback) {
  const url = `${baseUrl}?action=query&generator=allcategories&gacprefix=${searchTerm}&format=json`;

  const options = {
    url
  }

  request.get(url)
    .then(response => {
      let responseBody;
      try {
        responseBody = JSON.parse(response.text);
      } catch (e) {
        console.log(e);
      }

      let categories = [];

      // parse response content
      if (responseBody && responseBody.query && responseBody.query.pages) {
        Object.keys(responseBody.query.pages).forEach(pageId => {
          let page = responseBody.query.pages[pageId.toString()];
          categories.push({ title: page.title });
        })
      }

      callback(null, categories);
    })
    .catch(err => callback(err));
}

function uploadFileToCommons(fileUrl, user, formFields, callback) {
  const {
    fileTitle,
    description,
    categories,
    licence,
    source,
    sourceUrl,
    sourceAuthors,
    date,
  } = formFields
  let file;
  let fileMime;
  const errors = []

  if (fileUrl) {
    file = fs.createReadStream(fileUrl);
  } else {
    errors.push('File is required')
  }

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
  }
  if (errors.length > 0) {
    console.log(errors)
    return callback(errors.join(', '))
  }

  if (file) {
    const uploadFuncArray = []
    let token, tokenSecret
    // convert file
    uploadFuncArray.push((cb) => {
      console.log('Logging in wikimedia')
      User
        .findOne({ mediawikiId: user.mediawikiId })
        .select('mediawikiToken mediawikiTokenSecret')
        .exec((err, userInfo) => {
          if (err) {
            return callback('Something went wrong, please try again')
          }
          if (!userInfo || !userInfo.mediawikiToken || !userInfo.mediawikiTokenSecret) {
            return callback('You need to login first');
          }
          token = userInfo.mediawikiToken
          tokenSecret = userInfo.mediawikiTokenSecret
          cb()
        })
    })

    uploadFuncArray.push((cb) => {
      console.log(' starting upload, the file is ')
      // upload file to mediawiki
      wikiUpload.uploadFileToMediawiki(token, tokenSecret, file, { filename: fileTitle, text: `${description} ${categories.map((category) => `[[${category}]]`).join(' ')}` })
        .then((result) => {
          if (result.result === 'Success') {
            // update file licencing data
            console.log('uploaded', result)
            const wikiFileUrl = result.imageinfo.url
            const wikiFileName = `File:${result.filename}`
            const licenceInfo = licence === 'none' ? 'none' : `{{${source === 'own' ? 'self|' : ''}${licence}}}`
            wikiUpload.createWikiArticleSection(token, tokenSecret, wikiFileName, '=={{int:license-header}}==', licenceInfo)
              .then(() => {
                // update file description
                const fileDescription = `{{Information|description=${description}|date=${date}|source=${source === 'own' ? `{{${source}}}` : sourceUrl}|author=${source === 'own' ? `[[User:${user.username}]]` : sourceAuthors}}}`

                wikiUpload.createWikiArticleSection(token, tokenSecret, wikiFileName, '== {{int:filedesc}} ==', fileDescription)
                  .then(() => {
                    callback(null, { success: true, url: wikiFileUrl })
                    cb()
                  })
                  .catch((err) => {
                    const reason = err && err.code ? `Error [${err.code}]${!err.info ? '' : `: ${err.info}`}` : 'Something went wrong'
                    console.log('error updating desc', err)
                    callback(reason)
                    cb()
                  })
              })
              .catch((err) => {
                const reason = err && err.code ? `Error [${err.code}]${!err.info ? '' : `: ${err.info}`}` : 'Something went wrong'
                console.log('Error updating licence ', err)
                callback(reason)
                cb()
              })
          } else {
            return callback('Something went wrong!')
          }
        })
        .catch((err) => {
          console.log('error uploading file ', err)
          const reason = err && err.code ? `Error [${err.code}]${!err.info ? '' : `: ${err.info}`}` : 'Something went wrong'
          cb()
          return callback(reason)
        })
    })

    async.series(uploadFuncArray, (err, result) => {
      console.log(err, result)
    })
  } else {
    return callback('Error while uploading file')
  }
}

const fetchCommonsVideoUrlByName = function(videoUrl, callback) {
  // We try a sequence of formats till finding the correct file
  console.log(videoUrl)
  const fileName = videoUrl.split('/').pop();
  const fileExt = videoUrl.split('.').pop();
  const urls = VIDEOS_TRANSCODE_FORMATS.map((transcode) => `${videoUrl}/${fileName}.${transcode[0]}${transcode[1] === 'webm' ? '' : `.${transcode[1]}`}.${fileExt}`);
  async.detectLimit(urls, 2, (url, cb) => {
    console.log(url)
    request.get(url)
    .then((res) => cb(null, Buffer.isBuffer(res.body)))
    .catch(() => cb(null, null))
  }, (err, url) => {
    if (err) return callback(err);
    return callback(null, url);
  })
}

export {
  fetchImagesFromCommons,
  fetchGifsFromCommons,
  fetchVideosFromCommons,
  fetchCategoriesFromCommons,
  uploadFileToCommons,
  fetchCommonsVideoUrlByName,
}
