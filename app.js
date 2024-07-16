const fs = require('fs-extra')
const ffmpeg = require('fluent-ffmpeg')
const isVideo = require('is-video')
const { exec } = require('child_process')
const path = require('path')
const crypto = require("crypto")

const dotenv = require('dotenv')
const express = require('express')
const cors = require('cors')
const app = express()
const ews = require('express-ws')(app)
const ws = require('ws').Server
const wss = new ws({ port: 7001 })
const compression = require('compression')
const multer = require('multer')
const ytdl = require('ytdl-core')
dotenv.config()
app.use(compression({
    threshold: 0,
    level: 4,
    memLevel: 9
}))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    res.removeHeader('X-Powered-By')
    res.removeHeader('Server')
    res.setHeader('Service-Worker-Allowed', '/')
    const date = new Date()
    const time = Intl.DateTimeFormat("ja-JP", { timeStyle: "medium" }).format(date)
    console.log(`[${time}] ${req.method}:${decodeURIComponent(req.path)}`)
    next()
})
const upload = multer({ dest: `${__dirname}/tmp/` }).single('filebody')
const PORT = process.env.PORT

express.static.mime.define({ 'text/javascript': ['fa-exe'] })
app.use('/src', express.static('src'))

app.route('/api/files/*')
    .get(async (request, response) => {
        // *のパスを取得
        const targetPath = request.params['0']

        fs.stat(`./file/${targetPath}`)
            .then(async (result) => {
                if (Object.keys(request.query).includes('info')) return response.status(200).json(result)
                if (result.isFile()) {
                    if (Object.keys(request.query).includes('thumbnail')) {
                        if (isVideo(`./file/${targetPath}`) === false) return response.status(400).json({ code: "400", message: 'file is not video' })
                        const fileName = crypto.createHash('sha1')
                            .update(targetPath)
                            .digest()
                        ffmpeg(`${__dirname}/file/${targetPath}`)
                            .on('end', async () => {
                                if (await fs.exists(`./thumbnails/${fileName}.png`) !== true) return response.status(500).json({ code: "500", message: 'Server Error' })
                                response.sendFile(`${__dirname}/thumbnails/${fileName}.png`)
                            })
                            .takeScreenshots({
                                count: 1,
                                timemarks: ['0%'],
                                filename: `${fileName}.png`,
                                size: '480x?',  // 縦は可変
                                folder: path.join(__dirname, 'thumbnails')
                            })
                    }
                    return response.sendFile(`${__dirname}/file/${targetPath}`)
                }
                if (result.isDirectory()) {
                    try {
                        const files = []
                        const directories = []
                        const readdir = await fs.readdir(`./file/${targetPath}`)
                        await Promise.all(
                            readdir.map(async (file) => {
                                const stat = await fs.stat(`./file/${targetPath + file}`)
                                stat.isDirectory() ? directories.push({ name: file, type: 'directory', size: stat.size }) : files.push({ name: file, type: 'file', size: stat.size })
                            })
                        )
                        files.sort((a, b) => a.name.localeCompare(b.name), 'ja')
                        directories.sort((a, b) => a.name.localeCompare(b.name), 'ja')
                        response.status(200).json([...directories, ...files])
                    } catch (e) {
                        console.error(e)
                        response.status(500).json({ code: "500", message: 'Server Error' })
                    }
                }
            })
            .catch((error) => {
                (error.code === "ENOENT") ?
                    response.status(404).json({ code: "404", message: 'Not found' }) :
                    response.status(500).json({ code: "500", message: 'Server Error' })
            })
    })
    .head(async (request, response) => {
        const targetPath = request.params['0']

        try {
            await fs.lstat(`./file/${targetPath}`)
            response.status(200).json()
        } catch {
            response.status(404).json()
        }
    })
    .post((request, response) => {
        const targetPath = request.params['0']
        if (targetPath.endsWith('/')) {
            fs.mkdir(`./file/${targetPath}`, { recursive: true })
                .then(() => response.status(201).json({ path: targetPath }))
                .catch(() => { response.status(500).json({ code: "500", message: 'Server Error' }) })
            return
        }

        const source = request.query.source
        if (!source) return response.status(400).json({ code: "400", message: 'Bad request' })
        if (source === 'upload') {
            upload(request, response, function (err) {
                if (err) return response.status(500).json({ code: "500", message: 'upload failed' })
                fs.copyFile(`./tmp/${request.file.filename}`, `./file/${targetPath}`)
                    .then(() => {
                        response.status(201).json({ path: targetPath })
                    })
                    .catch(() => {
                        response.status(500).json({ code: "500", message: 'Server Error' })
                    })
            })
        } else if (source === 'youtube') {
            const type = request.query.type
            const id = request.query.id
            if (!(type && id)) return response.status(400).json({ code: "400", message: 'Bad request' })
            let sendInterval = 5

            ytdl(`https://www.youtube.com/watch?v=${id}`, { filter: 'audioonly', quality: 'highestaudio' })
                .prependOnceListener('response', () => response.write(JSON.stringify({ status: 'audio download started' })) + '\n')
                .prependListener('progress', (chunkLength, downloaded, total) => {
                    sendInterval--
                    const floatDownloaded = downloaded / total
                    const DownloadedPercent = (floatDownloaded * 100).toFixed(2)
                    if (sendInterval === 0) {
                        sendInterval = 5
                        response.write(JSON.stringify({ status: 'progress', floatDownloaded, DownloadedPercent }) + '\n')
                    }
                }).prependListener('end', async () => {
                    if (type === 'audioonly') {
                        await fs.copyFile(`./ytdl/${id}-audio.mp3`, `./file/${targetPath}.mp3`)
                        response.write(JSON.stringify({ status: 'ended' }) + '\n')
                    } else if (type === 'both') {
                        response.write(JSON.stringify({ status: 'video download started' }) + '\n')
                        ytdl(`https://www.youtube.com/watch?v=${id}`, { filter: (format) => format.container === 'mp4', quality: 'highestvideo' })
                            .prependListener('progress', (chunkLength, downloaded, total) => {
                                sendInterval--
                                const floatDownloaded = downloaded / total
                                const DownloadedPercent = (floatDownloaded * 100).toFixed(2)
                                if (sendInterval === 0) {
                                    sendInterval = 5
                                    response.write(JSON.stringify({ status: 'progress', floatDownloaded, DownloadedPercent }) + '\n')
                                }
                            })
                            .prependListener('end', () => {
                                response.write(JSON.stringify({ status: 'audio video merging' }) + '\n')
                                ffmpeg()
                                    .addInput(`./ytdl/${id}-audio.mp3`) //your video file input path
                                    .addInput(`./ytdl/${id}-video.mp4`) //your audio file input path
                                    .outputOptions(['-c:v copy', '-c:a aac'])
                                    .on('end', () => {
                                        response.write(JSON.stringify({ status: 'ended' }) + '\n')
                                    })
                                    .save(`./file/${targetPath}.mp4`)
                            }).pipe(fs.createWriteStream(`./ytdl/${id}-video.mp4`))
                    }
                }).pipe(fs.createWriteStream(`./ytdl/${id}-audio.mp3`))
        }
    })
    .delete((request, response) => {
        const targetPath = request.params['0']
        fs.stat(`./file/${targetPath}`)
            .then(async (result) => {
                // fsだと中身があると削除できないため
                fs.remove(`./file/${targetPath}`)
                    .then(() => {
                        response.status(204).json()
                    })
                    .catch(error => {
                        response.status(500).json({ code: "500", message: 'Server Error' })
                    })
            })
            .catch((error) => {
                (error.code === "ENOENT") ?
                    response.status(404).json({ code: "404", message: 'Not found' }) :
                    response.status(500).json({ code: "500", message: 'Server Error' })
            })
    })
    .patch((request, response) => {
        const targetPath = request.params['0']

        const command = request.query.cmd
        const target = request.query.target

        if (!(command && target)) return response.status(400).json({ code: "400", message: 'Bad request' })

        const dir = path.dirname(`./file/${targetPath}`)
        if (command === 'rename') {
            fs.rename(`./file/${targetPath}`, path.join(dir, target))
                .then(() => { response.status(200).json({ target: path.join(dir, target) }) })
                .catch(() => { response.status(500).json({ code: "500", message: 'Server Error' }) })
        }
        if (command === 'move') {
            fs.move(`./file/${targetPath}`, path.join(__dirname, 'file', target))
                .then(() => { response.status(200).json({ target }) })
                .catch(() => { response.status(500).json({ code: "500", message: 'Server Error' }) })
        }
    })

app.route('/api/backgrounds/*')
    .get(async (request, response) => {
        const targetPath = request.params['0']
        fs.stat(`./backgrounds/${targetPath}`)
            .then(async (result) => {
                if (result.isFile()) {
                    return response.sendFile(`${__dirname}/backgrounds/${targetPath}`)
                }
                if (result.isDirectory()) {
                    try {
                        const files = await fs.readdir(`./backgrounds/`)
                        response.status(200).json(files)
                    } catch (e) {
                        console.error(e)
                        response.status(500).json({ code: "500", message: 'Server Error' })
                    }
                }
            })
            .catch((error) => {
                (error.code === "ENOENT") ?
                    response.status(404).json({ code: "404", message: 'Not found' }) :
                    response.status(500).json({ code: "500", message: 'Server Error' })
            })
    })
    .post(async (request, response) => {
        upload(request, response, function (err) {
            if (err) return response.status(500).json({ code: "500", message: 'upload failed' })
            const uuid = crypto.randomUUID()

            fs.copyFile(`./tmp/${request.file.filename}`, `./backgrounds/${uuid}.png`)
                .then(() => {
                    response.status(201).json({ path: `${uuid}.png` })
                })
                .catch(() => {
                    response.status(500).json({ code: "500", message: 'Server Error' })
                })
        })
    })

app.route('/api/youtube/info/*')
    .get((request, response) => {
        const videoId = request.params[0]
        ytdl.getInfo(videoId)
            .then((info) => {
                response.status(200).json(info)
            })
            .catch(error => {
                response.status(404).json({ code: "404", message: 'video not found' })
            })
    })

app.route('/api/error/')
    .post((request, response) => {
        console.log(request.body.content)
        response.status(204).json()
    })

app.all('/api/ping/', (request, response) => {
    response.status(204).json()
})

app.get('/*/', function (request, response) {
    if (request.query.ver === 'beta') {
        return response.sendFile(__dirname + '/beta.html')
    }
    response.sendFile(__dirname + '/index.html')
})

app.ws('/api/watch/*/', (ws, req) => {
    let watchingDirectory = req.params[0] || ''
    console.log('connect', watchingDirectory)
    const eventFunc = (eventType, fileName) => {
        console.log('change')
        ws.send(JSON.stringify({ do: 'fileChanged', type: eventType, filename: fileName }))
    }
    let fsWatcher = fs.watch(`.file/${watchingDirectory}`, eventFunc)

    ws.on('message', msg => {
        const json = JSON.parse(msg)
        if (json.cmd === 'changeDirectory') {
            watchingDirectory = json.path
            fsWatcher.close()
            fsWatcher = fs.watch(`.file/${watchingDirectory}`, eventFunc)
        }
    })

    ws.on('close', () => {
        fsWatcher.close()
    })
})

//wss.on('connection', (ws) => {
//    let watchingDirectory
//    let fsWatcher
//    console.log('connect', watchingDirectory)
//    const eventFunc = (eventType, fileName) => {
//        console.log('change')
//        ws.send(JSON.stringify({ do: 'fileChanged', type: eventType, filename: fileName }))
//    }
//
//    ws.on('message', msg => {
//        const json = JSON.parse(msg)
//        if (json.cmd === 'changeDirectory') {
//            watchingDirectory = json.path
//            fsWatcher.close()
//            fsWatcher = fs.watch(`.file/${watchingDirectory}`, eventFunc)
//        }
//    })
//
//    ws.on('close', () => {
//        fsWatcher?.close()
//    })
//})

process.on('uncaughtException', function (err) {
    console.log('uncaughtException' + err)
})

app.listen(PORT, function () {
    console.log('server listening. Port:' + PORT)
})
