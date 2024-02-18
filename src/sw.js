const CACHE_VERSION = 'v1';
const CACHE_NAME = `${registration.scope}!${CACHE_VERSION}`;

class FilePath {
    constructor(pathname) { this.pathname = pathname }
    get extension() {
        if (this.pathname.includes('.')) {
            return this.pathname.split('.').at(-1);
        } else {
            return this.pathname.split('/').at(-1);
        }
    }
    get path() {
        const array = this.pathname.split('/');
        array.pop();
        return array.join('/') + '/';
    }
    get name() {
        return this.pathname.split('/').at(-1);
    }
    get nameWithoutExtension() {
        const name = this.pathname.split('/').at(-1);
        const array = name.split('.');
        array.pop();
        return array.join('.');
    }
}

// Rough implementation. Untested.
function timeoutWithPromise(ms, promise) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            reject(new Error("timeout"))
        }, ms)
        promise.then(resolve, reject)
    })
}

self.addEventListener('install', (event) => {
    console.log('[Service Worker] installed')
    self.skipWaiting()
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(['/fileapp/', '/fileapp/?ver=beta']);
            })
    );

});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] activated')
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return cacheNames.filter((cacheName) => {
                // このスコープに所属していて且つCACHE_NAMEではないキャッシュを探す
                return cacheName.startsWith(`${registration.scope}!`) &&
                    cacheName !== CACHE_NAME;
            });
        }).then((cachesToDelete) => {
            return Promise.all(cachesToDelete.map((cacheName) => {
                // いらないキャッシュを削除する
                return caches.delete(cacheName);
            }));
        })
    );
});

//self.addEventListener("fetch", async function (event) {
//    const url = new URL(event.request.url)
//    const isBeta = url.searchParams.get('ver') === 'beta'
//    url.searchParams.delete('ver')
//    const isFolderPath = new FilePath(url.pathname).name === ''
//    if (!isFolderPath || self.navigator.onLine) {
//        return
//    }
//    event.respondWith(
//        caches.match(isBeta ? '/fileapp/?ver=beta' : '/fileapp/')
//            .then(response => response)
//    )
//});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    if(!url.protocol.includes('http')){
        return
    }
    if (event.request.url.includes('fileapp/api/')) {
        return
    }
    const isFolderPath = new FilePath(url.pathname).name === ''
    // ファイルパスの場合は本体のキャッシュを返す
    if (isFolderPath) {
        const isBeta = url.searchParams.get('ver') === 'beta'
        url.searchParams.delete('ver')
        const targetURL = isBeta ? '/fileapp/?ver=beta' : '/fileapp/'
        caches.open(CACHE_NAME)
            .then((cache) => {
                cache.addAll(['/fileapp/', '/fileapp/?ver=beta']);
            })
        event.respondWith(
            caches.match(targetURL)
                .then(response => response)
        )
        return
    }
    // レスポンスを宣言する
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                if (response) {
                    if(location.origin === url.origin){
                        fetch(event.request).then(response => {
                            const cacheResponse = response.clone();
                            caches.open(CACHE_NAME).then(function (cache) {
                                cache.put(event.request, cacheResponse);
                            });
                        }).catch(e => console.error(e))
                    }
                    return response
                }

                return fetch(event.request).then(response => {
                    // キャッシュを更新する
                    const cacheResponse = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, cacheResponse);
                    });
                    return response
                })
            })
        })
    );
});