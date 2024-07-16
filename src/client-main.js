/*
function class は先頭大文字
変数 は先頭小文字
単語の区切りは大文字
function の定義は アロー関数
*/

"use strict";

const ErrorHandle = (message) => {
	const body = {
		content: message
	};
	const headers = {
		type: 'application/json',
	};
	const blob = new Blob([JSON.stringify(body)], headers);

	navigator.sendBeacon('/api/error/', blob)
}

window.addEventListener('error', (e) => {
	ErrorHandle(`${e.type}: ${e.message}`)
})

window.addEventListener("unhandledrejection", (e) => {
	ErrorHandle(e.reason)
});

const validQueryDomains = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'gaming.youtube.com',
	'youtu.be',
]);
const idRegex = /^[a-zA-Z0-9-_]{11}$/;
const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts)\/)/;
const getURLVideoID = link => {
	const parsed = new URL(link.trim());
	let id = parsed.searchParams.get('v');
	if (validPathDomains.test(link.trim()) && !id) {
		const paths = parsed.pathname.split('/');
		id = parsed.host === 'youtu.be' ? paths[1] : paths[2];
	} else if (parsed.hostname && !validQueryDomains.has(parsed.hostname)) {
		throw Error('Not a YouTube domain');
	}
	if (!id) {
		throw Error(`No video id found: "${link}"`);
	}
	id = id.substring(0, 11);
	if (!idRegex.test(id.trim())) {
		throw TypeError(`Video id (${id}) does not match expected ` +
			`format (${idRegex.toString()})`);
	}
	return id;
};

const element = {
	form: document.getElementById('fileform'),
	dropZone: document.getElementById('drop-zone'),
	fileInput: document.getElementById('uploadfile'),
	fileName: document.getElementById('filename'),
	youtubeurl: document.getElementById('youtubeurl'),
	youtubename: document.getElementById('youtubename'),
	fileElement: document.getElementsByClassName("files")[0],
	FileContextmenu: document.getElementsByClassName('FileContext')[0],
};

const filePath = {
	GetExtension: path => {
		if (path.includes('.')) {
			return path.split('.').at(-1);
		} else {
			return path.split('/').at(-1);
		}
	},
	GetPath: path => {
		const array = path.split('/');
		array.pop();
		return array.join('/') + '/';
	},
	GetName: path => {
		return path.split('/').at(-1);
	},
	GetNameWithoutExtension: path => {
		const name = path.split('/').at(-1);
		const array = name.split('.');
		array.pop();
		return array.join('.');
	}
}

class EventRegister {
	constructor() { this.events = {} }
	On(name, fn) {
		if (this.events[name] === undefined) this.events[name] = new Array()
		this.events[name].push(fn)
	}
	Emit(name, ...arg) {
		if (this.events[name] === undefined) return
		this.events[name].forEach(fn => fn(...arg))
	}
}

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

class ContextMenu {
	constructor(option) {
		this.option = option
		this.option.parentElement = (option.parentElement) ?? document.body
		this.DOM = document.createElement('div')
		this.DOM.classList.add('contextmenu')
		this.option.menuList.forEach(menu => {
			switch (menu.type) {
				case 'line': {
					const menuElement = document.createElement('hr')
					this.DOM.appendChild(menuElement)
					break;
				}
				default: {
					const menuButtonElement = document.createElement('button')
					menuButtonElement.classList.add('contextmenuChild')
					menuButtonElement.innerText = menu.text
					menuButtonElement.addEventListener('click', menu.onClick, { once: true })
					menuButtonElement.addEventListener('hover', menu.onHover, { once: false })
					Object.assign(menuButtonElement.style, menu.style)
					if (menu.submenu) {
						const subContextmenu = new ContextMenu({
							parentElement: menuButtonElement,
							menuList: menu.submenu
						})
						const SubMenuShowHandle = () => {
							subContextmenu.Show()
							const rect = menuButtonElement.getBoundingClientRect()
							subContextmenu.DOM.style.top = '0px'
							subContextmenu.DOM.style.left = rect.width + 'px'
							if (window.innerWidth - rect.right < rect.width) {
								subContextmenu.DOM.style.left = 0 - (rect.width + 20/*padding*/) + 'px';
							}
						}
						const SubMenuHideHandle = () => {
							subContextmenu.Remove()
						}
						menuButtonElement.addEventListener('mouseover', e => {
							if (!(e.target === menuButtonElement)) {
								return
							}
							SubMenuShowHandle()
						})
						menuButtonElement.addEventListener('click', e => {
							if (!(e.target === menuButtonElement)) {
								return SubMenuHideHandle()
							}
							e.stopImmediatePropagation()
							SubMenuShowHandle()
						})
						menuButtonElement.addEventListener('mouseleave', e => {
							if (!(e.target === menuButtonElement)) {
								return
							}
							SubMenuHideHandle()
						})
					}
					if (menu.icon) {
						const iconElement = document.createElement('div')
						iconElement.classList.add('contextIcon')
						iconElement.style.webkitMaskImage = `url(${menu.icon})`
						iconElement.style.maskImage = `url(${menu.icon})`
						menuButtonElement.appendChild(iconElement)
					}
					this.DOM.appendChild(menuButtonElement)
					break;
				}
			}
		});
	}
	Show() {
		this.option.parentElement.appendChild(this.DOM);
		this.DOM.animate(
			[
				{ opacity: 0 },
				{ opacity: 1 }
			], {
			duration: 100, //再生時間（ミリ秒）
			easing: 'linear', //イージング
		})
		this.DOM.firstChild.focus()
		this.SetPosition(this.option.x ?? mousePosition.x, this.option.y ?? mousePosition.y)
		setTimeout(() => {
			document.addEventListener('click', e => this.Remove(), { once: true })
			window.addEventListener('blur', e => this.Remove(), { once: true })
			document.addEventListener('contextmenu', e => this.Remove(), { once: true })
			document.addEventListener('mousewheel', e => this.Remove(), { passive: false, once: true });
		}, 10);
		return this
	}
	SetPosition(x, y) {
		this.DOM.style.top = y + 'px',
			this.DOM.style.left = x + 'px'
		if (window.innerHeight - y < this.DOM.offsetHeight) {
			this.DOM.style.top = y - this.DOM.offsetHeight + 'px';
		}
		if (window.innerWidth - x < this.DOM.offsetWidth) {
			this.DOM.style.left = x - this.DOM.offsetWidth + 'px';
		}
		return this
	}
	Remove() {
		this.DOM.remove();
		return this;
	}
}

class Modal extends EventRegister {
	constructor(option) {
		super()
		this.option = option ?? []
		this.clone = document.querySelector('#modalTemplate').content.cloneNode(true);
		this.title = this.clone.querySelector('.modal__title');
		this.buttons = this.clone.querySelector('.modal__buttons');
		this.body = this.clone.querySelector('.modal__body');
		this.modal = this.clone.querySelector('.modal');
	}
	SetTitle(name) {
		this.title.innerText = name;
		this.name = name
		return this
	}
	SetContent(selector) {
		// selector.content からクローンしてbodyに追加
		const contentTemplate = selector.content.cloneNode(true);
		this.body.appendChild(contentTemplate)
		return this
	}
	Open(callback = () => { }) {
		(this.option.buttons ?? [{
			iconPath: '/src/ico/x.svg',
			onClick: () => this.Close()
		}]).forEach(buttonSetting => {
			const button = document.createElement('button')
			button.classList.add('actionButton')
			button.addEventListener('click', () => buttonSetting.onClick(this))
			button.style.webkitMaskImage = `url(${buttonSetting.iconPath})`
			button.style.maskImage = `url(${buttonSetting.iconPath})`
			this.buttons.appendChild(button)
		})
		// bodyにmodal追加
		document.body.appendChild(this.clone);
		this.modal.parentElement.animate(
			[
				{ opacity: 0 },
				{ opacity: 1 }
			], {
			duration: 100, //再生時間（ミリ秒）
			easing: 'linear', //イージング
		})
		// Escで消す
		const escEvent = document.addEventListener('keydown', e => {
			if (e.key !== 'Escape') return
			this.Close()
			removeEventListener('keydown', escEvent)
		})
		// callbackを実行
		callback(this.body);
		return this
	}
	FullScreen() {
		this.modal.classList.add('fullscreen')
		return this
	}
	ExitFullScreen() {
		this.modal.classList.remove('fullscreen')
		return this
	}
	ToggleFullscreen() {
		this.modal.classList.toggle('fullscreen')
		return this
	}
	Close() {
		const anime = this.modal.parentElement.animate(
			[
				{ opacity: 1 },
				{ opacity: 0 }
			], {
			duration: 100, //再生時間（ミリ秒）
			easing: 'linear', //イージング
		})
		anime.addEventListener('finish', () => this.modal.parentElement.remove());
		this.Emit('close')
		return this;
	}
}

class Toast {
	#removed = false
	constructor(string, option) {
		this.string = string;
		this.color = option.color ?? 'green';
		this.time = option.time ?? 5000;
		this.toast = document.createElement('div');
	}
	Show() {
		this.toast.classList.add('toast');
		this.toast.innerText = this.string;
		this.toast.style.borderLeft = `solid 3px var(--${this.color})`;
		this.toast.addEventListener('click', () => this.Remove());
		this.toast.animate(
			[
				{ opacity: 0, transform: 'translateX(500px)' },
				{ opacity: 1, transform: 'translateX(0px)' }
			], {
			duration: 400, //再生時間（ミリ秒）
			easing: 'ease-in-out', //イージング
		})
		document.querySelector('.toastArea').insertAdjacentElement('afterbegin', this.toast);
		setTimeout(e => this.Remove(), this.time);
	}
	Remove() {
		if (this.removed) return;
		const anime = this.toast.animate(
			[
				{ opacity: 1, transform: 'translateX(0px)' },
				{ opacity: 0, transform: 'translateX(500px)' }
			], {
			duration: 400, //再生時間（ミリ秒）
			easing: 'ease-in-out', //イージング
		})
		anime.addEventListener('finish', () => {
			this.toast.remove()
			this.removed = true
		});
	}
}

class BaseFileViewer {
	SetParentElement(element) {
		this.parentElement = element
		return this
	}
	SetURL(url) {
		this.url = url.replaceAll('#', '%23')
		return this
	}
}


class FileViewer extends BaseFileViewer {
	constructor() { super(element) }
	async Show() {
		const videoExtension = ['mp4', 'mpg', 'avi', 'wmv', 'mkv', 'ts', 'webm', 'mov', 'm2ts'];
		const audioExtension = ['mp3', 'ogg', 'wav', 'wma', 'm4a'];
		const imgExtension = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif', 'bmp', 'svg', 'webp'];
		const codeExtension = ['js', 'html', 'htm', 'xml', 'css', 'php', 'yaml', 'py', 'wasm', 'json', 'c', 'cc', 'cp', 'cpp', 'cxx', 'rb', 'rmd', 'swift', 'h', 'm', 'graphql', 'gql', 'rs', 'go', 'java', 'sql', 'pl'];
		const pdfExtension = ['pdf'];
		const markDownExtension = ['md'];
		const ex = filePath.GetExtension(this.url).toLowerCase()
		let filePreview
		if (videoExtension.includes(ex) || audioExtension.includes(ex)) {
			filePreview = document.createElement('video');
			filePreview.src = this.url
			filePreview.controls = true
			filePreview.volume = 0.5;
			filePreview.loop = userSettings.videoAutoLoop.value
			filePreview.load()
			if (userSettings.videoAutoPlay.value) filePreview.play()
		} else if (pdfExtension.includes(ex)) {
			filePreview = document.createElement('iframe');
			filePreview.src = '/src/pdfjs/web/viewer.html?file=' + this.url
			filePreview.frameBorder = 0
			filePreview.classList.add('pdf')
		} else if (markDownExtension.includes(ex)) {
			filePreview = document.createElement('div');
			const text = await (await fetch(this.url)).text();
			filePreview.innerHTML = markdown.parse(text)
		} else if (imgExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.src = this.url
			filePreview.classList.add('filePreview')
		} else if (codeExtension.includes(ex)) {
			filePreview = document.createElement('pre');
			const code = document.createElement('code');
			filePreview.appendChild(code);
			const text = await (await fetch(this.url)).text();
			code.textContent = text;
			hljs.highlightElement(code);
			hljs.lineNumbersBlock(code, { singleLine: true });
		} else {
			filePreview = document.createElement('iframe');
			filePreview.src = this.url
			filePreview.frameBorder = 0
			filePreview.sandbox = 'allow-scripts allow-pointer-lock	allow-presentation'
		}
		filePreview.classList.add('filePreview');
		this.parentElement.appendChild(filePreview)
		return this
	}
}

class filePreviewer extends BaseFileViewer {
	constructor() { super(element) }
	#didShowed = false
	SetIsFolder(isFolder) {
		this.isFolder = isFolder
		return this
	}
	async Show() {
		const videoExtension = ['mp4', 'mpg', 'avi', 'wmv', 'mkv', 'ts', 'webm', 'mov', 'm2ts'];
		const imgExtension = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif', 'bmp', 'svg', 'webp'];
		const pdfExtension = ['pdf'];
		const textExtension = ['md', 'text', 'js', 'html', 'htm', 'xml', 'css', 'php', 'yaml', 'py', 'wasm', 'json', 'c', 'cc', 'cp', 'cpp', 'cxx', 'rb', 'rmd', 'swift', 'h', 'm', 'graphql', 'gql', 'rs', 'go', 'java', 'sql', 'pl', 'bat']
		const audioExtension = ['mp3', 'ogg', 'wav', 'wma'];
		const zipExtension = ['zip', 'gz', '7z', 'rar', 'bz2', 'lzh', 'cab', 'sit']
		const presentationExtension = ['pptx', 'pptm', 'ppt', 'key', 'potx', 'xps']
		const ex = filePath.GetExtension(this.url).toLowerCase();
		const name = filePath.GetName(this.url);
		let filePreview
		if (this.isFolder) {
			filePreview = document.createElement('img');
			filePreview.draggable = false;
			filePreview.src = '/src/ico/folder.svg';
			filePreview.alt = name;
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
		} else if (imgExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.loading = 'lazy'
			filePreview.decoding = 'async'
			filePreview.fetchPriority = 'low'
			filePreview.src = this.url
			filePreview.alt = name
			filePreview.addEventListener('load', () => {
				//画像解像度
				const imageWidth = filePreview.naturalWidth
				const imageHeight = filePreview.naturalHeight
				if (imageWidth <= filePreview.width || imageHeight <= filePreview.height) {
					filePreview.style.imageRendering = 'pixelated'
				}
			}, { once: true })
		} else if (videoExtension.includes(ex)) {
			filePreview = document.createElement('video');
			filePreview.src = this.url
			filePreview.muted = true;
			filePreview.loop = true;
			filePreview.preload = 'none';
			filePreview.playsInline = true;
			filePreview.disablePictureInPicture = true;
			filePreview.addEventListener('mouseover', () => filePreview.play(), false);
			filePreview.addEventListener('mouseleave', () => filePreview.pause(), false);
			const observer = new IntersectionObserver(entries => entries.forEach(entry => {
				if (!entry.isIntersecting) return
				if (this.#didShowed) return
				this.#didShowed
				filePreview.load()
			}), {
				root: document.body,
				rootMargin: '0px',
				threshold: 0
			});
			observer.observe(filePreview);
		} else if (pdfExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.src = "/src/ico/textfile.svg"
			filePreview.alt = ''
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
			const Load = () => {
				if (this.#didShowed === true) return
				const drawCanvas = document.createElement('canvas');
				drawCanvas.width = 1280;
				drawCanvas.height = 720;
				const pdfjsLib = window['pdfjs-dist/build/pdf'];
				pdfjsLib.GlobalWorkerOptions.workerSrc = '/src/pdfjs/pdf.worker.js';
				const loadingTask = pdfjsLib.getDocument(this.url);
				loadingTask.promise.then((pdf) => {
					pdf.getPage(1).then(page => {
						const viewport = page.getViewport({ scale: 1 });
						drawCanvas.width = viewport.width
						drawCanvas.height = viewport.height
						drawCanvas.style.width = Math.floor(viewport.width) + "px";
						drawCanvas.style.height = Math.floor(viewport.height) + "px";
						const context = drawCanvas.getContext("2d", { willReadFrequently: true });
						// Render PDF page into canvas context
						const renderContext = {
							canvasContext: context,
							viewport: viewport,
						};
						const renderTask = page.render(renderContext);
						renderTask.promise.then(() => {
							const imageData = drawCanvas.toDataURL();
							filePreview.src = imageData
							filePreview.style.width = 'inherit'
							filePreview.style.height = 'inherit'
						});
						this.#didShowed = true
					});
				}, (reason) => {
					// PDF loading error
					console.error(reason);
				}
				);
			}
			const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting ? Load() : ''), {
				root: document.body,
				rootMargin: '0px',
				threshold: 0
			});
			observer.observe(filePreview);
		} else if (textExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.draggable = false;
			filePreview.src = '/src/ico/textfile.svg'
			filePreview.alt = '';
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
		} else if (audioExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.draggable = false;
			filePreview.src = '/src/ico/audiofile.svg'
			filePreview.alt = '';
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
		} else if (zipExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.src = '/src/ico/zipfile.svg'
			filePreview.draggable = false;
			filePreview.alt = '';
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
		} else if (presentationExtension.includes(ex)) {
			filePreview = document.createElement('img');
			filePreview.src = '/src/ico/presentationfile.svg'
			filePreview.draggable = false;
			filePreview.alt = '';
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
		} else {
			filePreview = document.createElement('img');
			filePreview.src = '/src/ico/file.svg';
			filePreview.draggable = false;
			filePreview.alt = '';
			filePreview.style.width = '48px'
			filePreview.style.height = '48px'
		}
		filePreview.classList.add('files.preview')
		this.parentElement.appendChild(filePreview)
	}
}

class AddedFile {
	status = {
		Progress: evt => {
			const percent = ((evt.loaded / evt.total) * 100).toFixed(1)
			this.DOM.querySelector('progress').value = percent / 100
			this.DOM.querySelector('.filename').innerText = `${this.name} - ${percent}%`
		},
		Abort: evt => {
			new Toast('中止しました', { color: 'red', time: 5000 }).Show()
			this.DOM.querySelector('.filename').innerText = `${this.name} - 中止`
		},
		Error: evt => {
			new Toast('エラーが発生しました', { color: 'red', time: 5000 }).Show()
			this.DOM.querySelector('.filename').innerText = `${this.name} - エラー`
		},
		Timeout: evt => {
			new Toast('タイムアウトが発生しました', { color: 'red', time: 5000 }).Show()
			this.DOM.querySelector('.filename').innerText = `${this.name} - タイムアウト`
		},
		Load: evt => {
			this.isUpload = true
			new Toast(`${this.name}をアップロードしました`, { color: 'green', time: 5000 }).Show()
			this.DOM.querySelector('.filename').innerText = `${this.name} - 完了`
			this.DOM.querySelector('progress').style.accentColor = 'var(--green)'
		}
	}
	constructor(fileObject, setting) {
		this.fileObj = fileObject
		this.name = setting.name ?? fileObject.name
		this.type = setting.type ?? fileObject.type
		this.target = setting.target ?? mainDirectoryViewer.path
		this.isUpload = false
		this.openable = setting.openable ?? true
		this.DOM = null
		this.XMLHttpRequest = new XMLHttpRequest()
		this.XMLHttpRequest.upload.addEventListener('progress', e => this.status.Progress(e))
		this.XMLHttpRequest.upload.addEventListener('abort', e => this.status.Abort())
		this.XMLHttpRequest.upload.addEventListener('error', e => this.status.Error())
		this.XMLHttpRequest.upload.addEventListener('timeout', e => this.status.Timeout())
		this.XMLHttpRequest.upload.addEventListener('load', e => this.status.Load())
	}
	static OpenModal(show) {
		if (show === true) {
			document.getElementsByClassName('modalbg')[0].style.display = 'flex'
		} else {
			document.getElementsByClassName('modalbg')[0].style.display = 'none'
		}
	}
	static modal = {
		Open: () => {
			document.getElementsByClassName('modalbg')[0].style.display = 'flex'
		},
		Close: () => {
			document.getElementsByClassName('modalbg')[0].style.display = 'none'
		},
		FormReset: check => {
			if (check === true) {
				if (confirm('リセットしてもよろしいですか?')) {
					fileInput.value = ''
					fileName.value = ''
				}
			} else {
				fileInput.value = ''
				fileName.value = ''
			}
		},
	}
	static FileUpload() {
		if (fileInput.files.length === 0 && fileName.value.length === 0) {
			alert('ファイルを選択してファイル名を入力してください')
			return false
		} else if (fileInput.files.length === 0) {
			alert('ファイルを選択してください')
			return false
		} else if (fileName.value.length === 0) {
			alert('ファイル名を入力して下さい')
			return false
		}
		modals.fileUpload.Close()
		Array.from(fileInput.files).forEach(file => {
			new AddedFile(file, {
				name: fileInput.files.length === 1 ? fileName.value : undefined
			})
				.Show()
				.Upload()
		})
	}
	Show() {
		const imgExtension = ['jpg', 'jepg', 'png', 'gif', 'tiff', 'tif', 'bmp'];
		const template = document.getElementById('uploadfileicotemplate')
		const clone = template.content.cloneNode(true);
		const newElement = document.createElement("div");
		newElement.classList.add("fileChild", "uploadfile");
		this.DOM = clone.querySelector('.fileinfo')
		document.querySelector('.uploadfiles').appendChild(newElement);
		if (this.type.includes('image')) {
			const previewIcon = clone.querySelector('img');
			const reader = new FileReader();
			reader.onload = e => previewIcon.src = e.target.result;
			reader.readAsDataURL(this.fileObj);
			previewIcon.setAttribute('alt', this.name);
			clone.querySelector('.filename').innerText = this.name;
		} else {
			const previewIcon = clone.querySelector('img');
			previewIcon.classList.remove('files.preview')
			previewIcon.src = '/src/ico/file.png';
			previewIcon.alt = this.name;
			clone.querySelector('.filename').innerText = this.name;
		}
		newElement.appendChild(clone);
		newElement.addEventListener('click', () => this.Open());
		newElement.querySelector('.filemenu').addEventListener('click', (e) => {
			e.stopPropagation();
			this.Context();
		})
		newElement.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.Context();
		}, true);
		return this
	}
	Upload() {
		this.isUpload = false
		const formData = new FormData();
		formData.append('filebody', this.fileObj);
		this.XMLHttpRequest.open('POST', `/api/files/${this.target + this.name}?source=upload`, true);
		this.XMLHttpRequest.send(formData);
	}
	Abort() {
		if (this.isUpload) {
			alert('すでに送信済みです')
			return
		}
		this.XMLHttpRequest.abort();
	}
	NameCopy() {
		const text = encodeURI(this.name)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	URLCopy() {
		const text = encodeURI(BASE_URL + this.name)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	async Open() {
		if (!this.openable) {
			alert('ファイルを開けません')
			return false
		}
		const template = document.getElementById('filepreviewtemplate');
		const videoExtension = ['mp4', 'mpg', 'avi', 'wmv', 'mkv', 'ts', 'webm', 'mov', 'm2ts'];
		const audioExtension = ['mp3', 'ogg', 'wav', 'wma'];
		const imgExtension = ['jpg', 'jepg', 'png', 'gif', 'tiff', 'tif', 'bmp', 'svg', 'webp'];
		const codeExtension = ['js', 'html', 'htm', 'xml', 'css', 'php', 'yaml', 'py', 'wasm', 'json', 'c', 'cc', 'cp', 'cpp', 'cxx', 'rb', 'rmd', 'swift', 'h', 'm', 'graphql', 'gql', 'rs', 'go', 'java', 'sql', 'pl'];
		const markDownExtension = ['md'];
		const previewBackGround = document.createElement('div');
		previewBackGround.classList.add('filebg', 'modalbg');
		document.body.appendChild(previewBackGround);
		const clone = template.content.cloneNode(true);
		let filePreview
		const reader = new FileReader();
		if (this.type.includes('video/')) {
			filePreview = document.createElement('video');
			reader.onload = e => filePreview.src = e.target.result;
			reader.readAsDataURL(this.fileObj);
			filePreview.setAttribute('controls', '');
			filePreview.setAttribute('id', 'filepreview');
			filePreview.volume = 0.5;
			filePreview.loop = true;
		} else if (this.type.includes('audio/')) {
			filePreview = document.createElement('audio');
			reader.onload = e => filePreview.src = e.target.result;
			reader.readAsDataURL(this.fileObj);
			filePreview.setAttribute('controls', '');
			filePreview.setAttribute('id', 'filepreview');
			filePreview.volume = 0.5;
			filePreview.loop = true;
		} else if (markDownExtension.includes(filePath.GetExtension(this.name))) {
			filePreview = document.createElement('div');
			reader.onload = e => {
				const text = e.target.result
				filePreview.style.height = window.innerHeight * 0.6 + 'px'
				filePreview.innerHTML = markdown.parse(text)
			};
			reader.readAsText(this.fileObj);
		} else if (this.type.includes('image/')) {
			filePreview = document.createElement('img');
			reader.onload = e => filePreview.src = e.target.result;
			reader.readAsDataURL(this.fileObj);
			filePreview.setAttribute('alt', this.name);
			filePreview.setAttribute('id', 'filepreview');
		} else if (codeExtension.includes(filePath.GetExtension(this.name))) {
			filePreview = document.createElement('pre');
			reader.onload = e => {
				const code = document.createElement('code')
				filePreview.appendChild(code)
				const text = e.target.result
				code.textContent = text
				code.style.height = window.innerHeight * 0.6 + 'px'
				hljs.highlightElement(code)
			};
			reader.readAsText(this.fileObj);
		} else if (this.type.includes('text/')) {
			filePreview = document.createElement('div');
			reader.onload = e => filePreview.textContent = e.target.result;
			reader.readAsText(this.fileObj);
		} else {
			filePreview = document.createElement('div');
			filePreview.innerText = '表示できないファイルです。'
		}
		clone.querySelector('.file__title').textContent = this.name;
		clone.querySelector('.file__body').appendChild(filePreview);
		clone.querySelector('.filepreviewclose').addEventListener('click', () => {
			previewBackGround.remove();
		}, false);
		previewBackGround.appendChild(clone);
	}
	Context() {
		new ContextMenu({
			menuList: [
				{
					text: 'ファイル名をコピー',
					onClick: () => this.NameCopy(),
				}, {
					text: 'ファイルのURLをコピー',
					onClick: () => this.URLCopy()
				}, {
					type: 'line'
				}, {
					text: 'アップロードの中断',
					onClick: () => this.Abort()
				}, {
					text: '再送信',
					onClick: () => this.Upload()
				}
			]
		}).Show()
	}
}

class FileFolderManager {
	constructor(path, fileInfo) {
		this.path = path
		this.size = fileInfo?.size
		this.filePath = new FilePath(path)
		this.favorite = new FavoriteManager(path)
	}
	async IsExits() {
		try {
			return await (await fetch(`/api/files/${this.path}`, { method: 'HEAD' })).ok
		} catch (e) {
			return false
		}
	}
	async Delete() {
		return await (await fetch(`/api/files/${this.path}`, { method: 'DELETE' })).ok
	}
	async Stat() {
		return await (await fetch(`/api/files/${this.path}?info`, { method: 'GET' })).text()
	}
	async Rename(name) {
		return await (await fetch(`/api/files/${this.path}?cmd=rename&target=${name}`, { method: 'PATCH' })).ok
	}
}

class FileManager extends FileFolderManager {
	constructor(path, fileInfo) {
		super(path, fileInfo)
		this.path = path
		this.size = fileInfo?.size
		this.filePath = new FilePath(path)
	}
}

class FolderManager extends FileFolderManager {
	constructor(path, fileInfo) {
		super(path, fileInfo)
		this.path = path
		this.size = fileInfo?.size
		this.filePath = new FilePath(path)
	}
	async createFolder({
		name
	}) {
		await fetch(`/api/files/${this.path + name}/`, { method: 'POST' });
	}
}

class FavoriteManager {
	static list = new Array()
	static {
		if (localStorage.getItem('favoriteList') === null) {
			localStorage.setItem('favoriteList', JSON.stringify([]))
		} else {
			FavoriteManager.list = JSON.parse(localStorage.getItem('favoriteList'))
		}
	}
	constructor(path) {
		this.path = path
	}
	get isListed() {
		return FavoriteManager.list.includes(this.path)
	}
	Add() {
		if (this.isListed) {
			return new Error('すでに登録済みです')
		}
		FavoriteManager.list.push(this.path)
		localStorage.setItem('favoriteList', JSON.stringify(FavoriteManager.list))
	}
	Remove() {
		const index = FavoriteManager.list.indexOf(this.path)
		if (index === -1) {
			return
		}
		FavoriteManager.list.splice(index, 1)
		localStorage.setItem('favoriteList', JSON.stringify(FavoriteManager.list))
	}
}

class FileUIBase {
	constructor(path, fileInfo) {
		this.manager = new FileManager(path, fileInfo)
		this.path = path
	}
	async Open() {
		const modal = new Modal({
			buttons: [{
				iconPath: '/src/ico/arrow-up-on-square.svg',
				onClick: () => this.Share()
			}, {
				iconPath: '/src/ico/arrows-pointing-out.svg',
				onClick: modal => modal.ToggleFullscreen()
			}, {
				iconPath: '/src/ico/x.svg',
				onClick: modal => modal.Close()
			},]
		})
			.SetTitle(this.manager.filePath.name)
			.Open(element => {
				new FileViewer()
					.SetParentElement(element)
					.SetURL(FILES_ROOT + this.path)
					.Show()
			})
	}
	NameCopy() {
		const text = encodeURI(this.manager.filePath.name)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	URLCopy() {
		const text = encodeURI(BASE_URL + this.path)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	async Rename() {
		const name = prompt('名前を入力してください', this.manager.filePath.name)
		if (Boolean(name) === false) return false;
		(await this.manager.Rename(name) == true) ? new Toast(`${this.manager.filePath.name}を名前変更しました。`, { color: 'green', time: 5000 }).Show() : new Toast(`エラーが発生しました`, { color: 'red', time: 5000 }).Show()
	}
	WindowOpen() {
		window.open(FILES_ROOT + this.path, 'filepreview.' + Math.random(), 'top=100,left=100,width=960,height=540,toolbar=yes,menubar=yes,scrollbars=yes')
	}
	Download() {
		const downloadElement = document.getElementById('jsdownload')
		downloadElement.href = `/api/files/${this.path}`
		downloadElement.click()
	}
	Share() {
		const ex = this.manager.filePath.extension.toLowerCase();
		const name = this.manager.filePath.name;
		const URL = encodeURI(BASE_URL + this.path)
		new Modal()
			.SetTitle(this.manager.filePath.name)
			.SetContent(document.querySelector('#filesharetemplate'))
			.Open(element => {
				element.querySelector('.url').value = URL;
				const QRcode = new QRCode(element.querySelector('.QRcode'), {
					text: URL,
					width: 256,
					height: 256,
					colorDark: "#000000",
					colorLight: "#ffffff",
					correctLevel: QRCode.CorrectLevel.L
				});
				element.querySelector('.url').addEventListener('input', () => QRcode.makeCode(element.querySelector('.url').value), false);
			})
	}
	Context() {
		new ContextMenu({
			menuList: [
				{
					text: '開く',
					onClick: () => this.Open(),
				}, {
					text: '新規ウィンドウで直接開く',
					onClick: () => this.WindowOpen(),
					icon: '/src/ico/arrow-top-right-on-square.svg'
				}, {
					type: 'line'
				}, {
					text: 'クリップボードにコピー',
					icon: '/src/ico/chevron-right.svg',
					submenu: [
						{
							text: 'ファイル名をコピー',
							onClick: () => this.NameCopy(),
						}, {
							text: 'ファイルのURLをコピー',
							onClick: () => this.URLCopy(),
						},
					]
				}, {
					type: 'line'
				}, {
					text: (() => {
						return `お気に入り${this.manager.favorite.isListed ? 'を解除' : 'に追加'}`;
					})(),
					onClick: () => {
						this.manager.favorite.isListed ? this.manager.favorite.Remove() : this.manager.favorite.Add()
					},
					icon: '/src/ico/star.svg'
				}, {
					text: 'ファイルのURLを共有',
					onClick: () => this.Share(),
					icon: '/src/ico/share.svg'
				}, {
					text: 'ファイルをダウンロード',
					onClick: () => this.Download(),
					icon: '/src/ico/arrow-down-tray.svg'
				}, {
					text: '名前変更',
					onClick: () => this.Rename()
				}, {
					text: '削除',
					onClick: () => this.Delete(),
					icon: '/src/ico/trash.svg',
					style: {
						color: 'red'
					}
				}, {
					text: 'プロパティ',
					onClick: () => { }
				}
			]
		}).Show()
	}
}

class directoryUI {
	constructor(parentElement) {
		this.parentElement = parentElement
	}
	AddFiles(fileUIs) {
		const fragment = document.createDocumentFragment();
		fileUIs.forEach(file => {
			const clone = document.getElementById('fileicotemplate').content.cloneNode(true);
			clone.querySelector('.filename').innerText = file.manager.filePath.name;
			if (extensions[file.manager.filePath.extension].filePreviewer) {

			} else {
				const iconElement = document.createElement('div')
				iconElement.classList.add('fileIcon')
				iconElement.style.webkitMaskImage = `url(${extensions[file.manager.filePath.extension].type.iconPath})`
				iconElement.style.maskImage = `url(${extensions[file.manager.filePath.extension].type.iconPath})`
				clone.querySelector('.fileico').appendChild(iconElement)
			}

			const fileChildElement = document.createElement("div");
			fileChildElement.classList.add("fileChild");
			fileChildElement.draggable = true
			fileChildElement.tabIndex = 0
			fileChildElement.dataset.filePath = file.path
			fileChildElement.appendChild(clone)

			fileChildElement.addEventListener('click', () => file.Open())
			fileChildElement.addEventListener('keydown', e => {
				if (e.key !== 'Enter') return
				file.Open()
				fileChildElement.blur()
			})
			fileChildElement.querySelector('.filemenu').addEventListener('click', e => {
				e.stopPropagation()
				file.Context()
			})
			fileChildElement.addEventListener('contextmenu', e => {
				e.preventDefault();
				file.Context();
			}, true);
			//fileChildElement.addEventListener("dragstart", e => this.directoryViewerClass.draggingElement = e.target);
			fragment.appendChild(fileChildElement);
		})
		this.parentElement.appendChild(fragment)
		return this
	}
	wipe() {
		this.parentElement.innerHTML = ''
	}
}

class FileFolderBase {
	constructor(path, settings) {
		this.data = settings?.data ?? {}
		this.path = path
		this.filePath = new FilePath(path)
		this.parentElement = settings?.parentElement ?? null
		this.directoryViewerClass = settings?.directoryViewer ?? null
	}
}

class AddedFileBase extends EventRegister {
	static files = new Array()
	constructor(targetPath) {
		this.targetPath = targetPath
		this.status = {
			isDone: false,
			isAborted: false,
			isError: false,
			percent: 0,
		}
	}
}

class UploadedFile extends AddedFileBase {
	constructor(fileObj, targetPath) {
		super(targetPath)
		this.fileObj = fileObj ?? new File()
		this.xhr = new XMLHttpRequest()
		this.xhr.upload.addEventListener('progress', e => {
			this.status.percent = Number(((e.loaded / e.total) * 100).toFixed(1))
		})
		this.xhr.upload.addEventListener('abort', e => {
			this.status.isAborted = true
		})
		this.xhr.upload.addEventListener('error', e => {
			this.status.isError = true
		})
		this.xhr.upload.addEventListener('timeout', e => {
			this.status.isError = true
		})
		this.xhr.upload.addEventListener('load', e => {
			this.status.isDone = true
		})
	}
	Upload() {
		const formData = new FormData();
		formData.append('filebody', this.fileObj);
		this.xhr.open('POST', `/api/files/${this.targetPath}?source=upload`, true);
		this.xhr.send(formData);
	}
	Open() {
		if (!this.status.isDone) {
			alert('アップロードが完了していないため開けません')
			return
		}
		const fileUI = new FileUIBase(this.targetPath)
		fileUI.Open()
	}
	Context() {
		if (this.status.isDone) {
			new FileUIBase(this.targetPath).Context()
		} else {
			new ContextMenu({
				menuList: [
					{
						text: 'クリップボードにコピー',
						icon: '/src/ico/chevron-right.svg',
						submenu: [
							{
								text: 'ファイル名をコピー',
								onClick: () => new FileUIBase(this.targetPath).NameCopy(),
							}, {
								text: 'ファイルのURLをコピー',
								onClick: () => new FileUIBase(this.targetPath).URLCopy()
							},
						]
					}, {
						text: 'ファイルのURLを共有',
						onClick: () => new FileUIBase(this.targetPath).Share(),
						icon: '/src/ico/share.svg'
					}, {
						type: 'line'
					}, {
						text: 'アップロードの中断',
						onClick: () => this.Abort(),
						style: {
							color: 'red'
						}
					}, {
						text: '再送信',
						onClick: () => this.Upload()
					}
				]
			}).Show()
		}
	}
}

class UploadedFileOld extends FileFolderBase {
	constructor(path, settings) { super(path, settings) }
	async Open() {
		this.directoryViewerClass?.Emit('fileOpen', this.path)
		const modal = new Modal({
			buttons: [{
				iconPath: '/src/ico/arrow-up-on-square.svg',
				onClick: () => this.Share()
			}, {
				iconPath: '/src/ico/arrows-pointing-out.svg',
				onClick: modal => modal.ToggleFullscreen()
			}, {
				iconPath: '/src/ico/x.svg',
				onClick: modal => modal.Close()
			},]
		})
			.SetTitle(this.filePath.name)
			.Open(element => {
				new FileViewer()
					.SetParentElement(element)
					.SetURL(FILES_ROOT + this.path)
					.Show()
			})
			.On('close', () => {
				this.directoryViewerClass?.Emit('fileClose', this.path)
			})
	}
	async Delete() {
		if (!confirm('フォルダーを削除しますか?')) {
			return
		}
		const res = await fetch(`/api/files/${this.path}`, {
			method: "DELETE",
		})
		res.ok ? new Toast(`${this.filePath.name}を削除しました。`, { color: 'green', time: 5000 }).Show() : new Toast(`エラーが発生しました`, { color: 'red', time: 5000 }).Show()
	}
	NameCopy() {
		const text = encodeURI(this.filePath.name)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	URLCopy() {
		const text = encodeURI(BASE_URL + this.path)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	async Rename() {
		const name = prompt('名前を入力してください', this.filePath.name)
		if (Boolean(name) === false) return false
		const response = await fetch(`/api/files/${this.path}?cmd=rename&target=${name}`, {
			method: 'PATCH',
			body: JSON.stringify({
				cmd: 'rename',
				target: this.filePath.path.slice(1) + name
			})
		});
		(response.ok == true) ? new Toast(`${this.filePath.name}を名前変更しました。`, { color: 'green', time: 5000 }).Show() : new Toast(`エラーが発生しました`, { color: 'red', time: 5000 }).Show()
	}
	WindowOpen() {
		window.open(FILES_ROOT + this.path, 'filepreview.' + Math.random(), 'top=100,left=100,width=960,height=540,toolbar=yes,menubar=yes,scrollbars=yes')
	}
	Download() {
		const downloadElement = document.getElementById('jsdownload')
		downloadElement.href = `/api/files/${this.path}`
		downloadElement.click()
	}
	Share() {
		const ex = this.filePath.extension.toLowerCase();
		const name = this.filePath.name;
		const URL = encodeURI(BASE_URL + this.path)
		new Modal()
			.SetTitle(this.filePath.name)
			.SetContent(document.querySelector('#filesharetemplate'))
			.Open(element => {
				element.querySelector('.url').value = URL;
				const QRcode = new QRCode(element.querySelector('.QRcode'), {
					text: URL,
					width: 256,
					height: 256,
					colorDark: "#000000",
					colorLight: "#ffffff",
					correctLevel: QRCode.CorrectLevel.L
				});
				element.querySelector('.url').addEventListener('input', () => QRcode.makeCode(element.querySelector('.url').value), false);
			})
	}
	Context() {
		new ContextMenu({
			menuList: [
				{
					text: '開く',
					onClick: () => this.Open(),
				}, {
					text: '新規ウィンドウで直接開く',
					onClick: () => this.WindowOpen(),
					icon: '/src/ico/arrow-top-right-on-square.svg'
				}, {
					type: 'line'
				}, {
					text: 'クリップボードにコピー',
					icon: '/src/ico/chevron-right.svg',
					submenu: [
						{
							text: 'ファイル名をコピー',
							onClick: () => this.NameCopy(),
						}, {
							text: 'ファイルのURLをコピー',
							onClick: () => this.URLCopy(),
						},
					]
				}, {
					type: 'line'
				}, {
					text: (() => {
						return `お気に入りに追加`;
					})(),
					onClick: () => {
						new FavoriteManager(this.path).Add()
					},
					icon: '/src/ico/star.svg'
				}, {
					text: 'ファイルのURLを共有',
					onClick: () => this.Share(),
					icon: '/src/ico/share.svg'
				}, {
					text: 'ファイルをダウンロード',
					onClick: () => this.Download(),
					icon: '/src/ico/arrow-down-tray.svg'
				}, {
					text: '名前変更',
					onClick: () => this.Rename()
				}, {
					text: '削除',
					onClick: () => this.Delete(),
					icon: '/src/ico/trash.svg',
					style: {
						color: 'red'
					}
				}, {
					text: 'プロパティ',
					onClick: () => { }
				}
			]
		}).Show()
	}
	Show() {
		const clone = document.getElementById('fileicotemplate').content.cloneNode(true);
		const fileChildElement = document.createElement("div");
		fileChildElement.classList.add("fileChild");
		fileChildElement.draggable = true
		fileChildElement.tabIndex = 0
		clone.querySelector('.filename').innerText = this.filePath.name;
		fileChildElement.dataset.filePath = this.path
		new filePreviewer()
			.SetURL(FILES_ROOT + this.path)
			.SetParentElement(clone.querySelector('.fileico'))
			.Show()
		fileChildElement.appendChild(clone)
		fileChildElement.addEventListener('click', () => this.Open())
		fileChildElement.addEventListener('keydown', e => {
			if (e.key !== 'Enter') return
			this.Open()
			fileChildElement.blur()
		})
		fileChildElement.querySelector('.filemenu').addEventListener('click', e => {
			e.stopPropagation()
			document.body.click()
			this.Context()
		})
		fileChildElement.addEventListener('contextmenu', e => {
			e.preventDefault();
			this.Context();
		}, true);
		fileChildElement.addEventListener("dragstart", e => {
			this.directoryViewerClass.draggingElement = e.target
			const dragImage = new Image()
			dragImage.src = '/src/ico/dragfileico.png'
			e.dataTransfer.setDragImage(dragImage, 0, 0)
		});
		this.parentElement.appendChild(fileChildElement);
		return this
	}
}

class Folder extends FileFolderBase {
	constructor(path, settings) { super(path, settings) }
	Show() {
		const clone = document.getElementById('fileicotemplate').content.cloneNode(true);
		const fileChildElement = document.createElement("div");
		clone.querySelector('.filename').innerText = this.filePath.name;
		fileChildElement.dataset.filePath = this.path
		fileChildElement.tabIndex = 0
		new filePreviewer()
			.SetIsFolder(true)
			.SetURL(this.path)
			.SetParentElement(clone.querySelector('.fileico'))
			.Show()
		fileChildElement.appendChild(clone)
		fileChildElement.classList.add("fileChild");
		fileChildElement.addEventListener('click', () => this.Open())
		fileChildElement.addEventListener('keydown', e => {
			if (e.key !== 'Enter') return
			this.Open()
			fileChildElement.blur()
		})
		fileChildElement.querySelector('.filemenu').addEventListener('click', e => {
			e.stopPropagation()
			document.body.click()
			this.Context()
		})
		fileChildElement.addEventListener('contextmenu', e => {
			e.preventDefault();
			this.Context();
		}, true);
		fileChildElement.addEventListener("dragover", e => e.preventDefault())
		fileChildElement.addEventListener('drop', async e => {
			event.preventDefault();
			const from = this.directoryViewerClass.draggingElement
			this.directoryViewerClass.draggingElement = null
			const path = from.dataset.filePath
			const response = await fetch(`/api/files/${path}?cmd=move&target=${this.path}/${filePath.GetName(path)}`, {
				method: 'PATCH',
				body: JSON.stringify({
					cmd: 'rename',
					target: this.filePath.path.slice(1) + name
				})
			});
		})
		this.parentElement.appendChild(fileChildElement);
		return this
	}
	Context() {
		new ContextMenu({
			menuList: [
				{
					text: '開く',
					onClick: () => this.Open(),
				}, {
					text: 'クリップボードにコピー',
					icon: '/src/ico/chevron-right.svg',
					submenu: [
						{
							text: 'フォルダー名をコピー',
							onClick: () => this.NameCopy(),
						}, {
							text: 'フォルダーのURLをコピー',
							onClick: () => this.URLCopy(),
						},
					]
				}, {
					text: '名前変更',
					onClick: () => this.Rename(),
				}, {
					text: '削除',
					onClick: () => this.Delete(),
					icon: '/src/ico/trash.svg',
					style: {
						color: 'red'
					}
				}
			]
		}).Show()
	}
	NameCopy() {
		const text = encodeURI(this.filePath.name)
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	URLCopy() {
		const text = encodeURI(BASE_URL + this.path) + '/'
		util.CopyToClipboard(text) ? new Toast(`コピーしました`, { color: 'green', time: 5000 }).Show() : new Toast(`コピーに失敗しました`, { color: 'red', time: 5000 }).Show()
	}
	async Delete() {
		if (!confirm('フォルダーを削除しますか?')) {
			return
		}
		const res = await fetch(`/api/files/${this.path}/`, {
			method: "DELETE",
		})
		res.ok ? new Toast(`${this.filePath.name}を削除しました。`, { color: 'green', time: 5000 }).Show() : new Toast(`エラーが発生しました`, { color: 'red', time: 5000 }).Show()
	}
	Open() {
		this.directoryViewerClass.ChangeDirectory(this.path + '/')
	}
	async Rename() {
		const name = prompt('名前を入力してください', this.filePath.name)
		if (Boolean(name) === false) return false
		const response = await fetch(`/api/files/${this.path}?cmd=rename&target=${name}`, {
			method: 'PATCH',
			body: JSON.stringify({
				cmd: 'rename',
				target: this.filePath.path.slice(1) + name
			})
		});
		(response.ok == true) ? new Toast(`${this.filePath.name}を名前変更しました。`, { color: 'green', time: 5000 }).Show() : new Toast(`エラーが発生しました`, { color: 'red', time: 5000 }).Show()
	}
}

class DirectoryViewer extends EventRegister {
	constructor(path, settings) {
		super()
		this.parentElement = settings.parentElement ?? null
		this.filesElement = null
		this.directoryPathInputElement = null
		this.searchInputElement = null
		this.clone = null
		this.path = path
		this.draggingElement = null
		this.filesCache = {}
		this.layout = settings.layout ?? 'default'
		this.filter = { search: settings.filter?.search ?? '', types: settings.filter?.type ?? ['directory', 'file'] }
	}
	ShowElements() {
		this.parentElement.classList.add('directoryViewer')
		this.clone = document.getElementById('directoryViewTemplate').content.cloneNode(true);
		this.parentElement.appendChild(this.clone)
		this.searchInputElement = this.parentElement.querySelector('.search')
		this.filesElement = this.parentElement.querySelector('.files');
		this.filesElement.dataset.layout = this.layout
		this.directoryPathInputElement = this.parentElement.querySelector('.directory');
		this.directoryPathInputElement.value = this.path
		this.parentElement.querySelector('.directoryBackButton').addEventListener('click', e => {
			const dirArray = this.path.split('/')
			const targetPath = dirArray.slice(0, dirArray.length - 2).join('/') + '/'
			this.ChangeDirectory(targetPath)
		})
		this.searchInputElement.addEventListener('change', e => this.SetFilter({ search: e.target.value }))
		return this
	}
	async #ReturnFilesArray() {
		const filesArray = (await (await fetch(`/api/files/${this.path}`, { priority: 'high' })).json())
		const filteredArray = filesArray.filter(item => item.name.includes(this.filter.search) && this.filter.types.includes(item.type))
		return Promise.resolve(filteredArray)
	}
	async UpdateFiles() {
		const filesArray = await this.#ReturnFilesArray()
		if (JSON.stringify(this.filesCache) === JSON.stringify(filesArray)) return false
		this.filesCache = filesArray
		this.filesElement.innerHTML = ''
		const fileLength = filesArray.length
		if (fileLength === 0) {
			this.filesElement.innerText = 'このフォルダーは空です'
		}
		else {
			filesArray.forEach(file => {
				if (file.type === 'directory') new Folder(this.path + file.name, { directoryViewer: this, parentElement: this.filesElement, data: file }).Show()
				else if (file.type === 'file') new UploadedFileOld(this.path + file.name, { directoryViewer: this, parentElement: this.filesElement, data: file }).Show()
			})
		}
		this.Emit('updateDirectory', filesArray, fileLength)
	}
	ChangeDirectory(path) {
		this.path = path
		this.UpdateFiles('/' + path)
		this.directoryPathInputElement.value = path
		this.Emit('changeDirectory', path)
	}
	async MakeDir(name) {
		const response = await fetch(`/api/files/${this.path + name}/`, {
			method: 'POST'
		});
	}
	SetLayout(layout) {
		this.layout = layout
		this.filesElement.dataset.layout = layout
		return this
	}
	SetFilter(obj) {
		this.filter.search = obj.search ?? this.filter.search
		this.filter.types = obj.type ?? this.filter.types
		this.UpdateFiles()
	}
}


const util = {
	RandomString: length => {
		return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(length)))).substring(0, length)
	},
	CopyToClipboard: text => {
		const textarea = document.getElementById('textarea')
		textarea.style.display = 'block',
			textarea.value = text
		textarea.select();
		setTimeout(() => textarea.style.display = 'none', 100)
		const copyResult = document.execCommand("copy");
		return copyResult
	},
	/**
		 * バイト書式変換
		 * @param {number} number 適用する数値
		 * @param {number} [point=0] 小数点の桁数
		 * @param {number} [com=1024] 1KBあたりのバイト数
		 * @return {string} 書式化された値を返す
	 */
	ByteFormat: (number, point, com) => {
		if (typeof number === 'undefined') throw '適用する数値が指定されていません。';
		if (!String(number).match(/^[0-9][0-9\.]+?/)) throw '適用する数値に誤りがあります。';
		if (!point) point = 0;
		if (!com) com = 1024;
		const bytes = Number(number),
			suffix = ['Byte', 'KB', 'MB', 'GB', 'TB', 'PB', 'ZB', 'YB'],
			target = Math.floor(Math.log(bytes) / Math.log(com));
		return (bytes / Math.pow(com, Math.floor(target))).toFixed(point) + ' ' + suffix[target];
	},
	SpeedTest: async () => {
		const Mb = 1000000;
		const start1 = performance.now();
		const data = await (await fetch(`/src/speedtest?cache=${Math.random()}`)).blob();
		const bit = data.size * 8
		const end1 = performance.now();
		const sec = ((end1 - start1) - await util.PingTest()) / 1000;
		const bytesPerSec = Math.round(bit / sec)
		const r1 = (bytesPerSec / Mb).toFixed()
		return Promise.resolve(r1);
	},
	PingTest: async () => {
		const pingStart = await performance.now();
		const pingFetch = await fetch(`/src/ping?cache=${Math.random()}`);
		const pingEnd = await performance.now();
		const ping = pingEnd - pingStart;
		return Promise.resolve(ping);
	},
	Css: e => {
		const t = document.createElement('style');
		t.textContent = e;
		document.head.appendChild(t);
	},
	ThemeColor: color => {
		document.getElementById('themecolor').setAttribute('content', color)
	},
	StringLength: string => {
		const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
		return [...segmenter.segment(string)].length;
	},
	StringToBool: string => {
		if (string === 'true') return true
		else if (string === 'false') return false
		else return null
	},
	watchObjProperty: (obj, propertyName, callback) => {
		let value = obj[propertyName];
		Object.defineProperty(obj, propertyName, {
			get: () => value,
			set: newValue => {
				const oldValue = value;
				value = newValue;
				callback(oldValue, value);
			}
		});
	},
	ReturnWatchArray: (array, callback) => {
		let deletedArray = null;
		return new Proxy(array, {
			// プロパティ削除時の動作をカスタマイズ
			deleteProperty: (target, property) => {
				// 削除操作呼び出し直後は empty item になるため、
				deletedArray = [...array];
				const result = Reflect.deleteProperty(target, property);
				return result;
			},
			// プロパティ設定時の動作をカスタマイズ
			set: (target, property, val, receiver) => {
				const oldArray = [...array];
				const result = Reflect.set(target, property, val, receiver);
				if (deletedArray) {
					// 削除操作を伴う場合の検知
					callback(deletedArray, target);
					deletedArray = null;
				} else if (property !== 'length') {
					// その他：追加や変更の検知
					callback(oldArray, target);
				}
				return result;
			},
		});
	}
}

if (window.navigator.standalone) util.Css(`* {-webkit-tap-highlight-color: rgba(0, 0, 0, 0);-webkit-user-select: none;touch-action:manipulation}input{-webkit-user-select: text;touch-action:unset;}`);

const modals = {
	fileUploadList: {
		Open: () => {
			const modal = new Modal()
				.SetTitle('ファイルを追加')
				.SetContent(document.querySelector('#fileAddTemplate'))
				.Open(element => {
					ChangeTitle('ファイルを追加')
					element.querySelector('button[data-name=fromLocal]').addEventListener('click', () => {
						modal.Close()
						modals.fileUpload.Open()
					})
					element.querySelector('button[data-name=fromYoutube]').addEventListener('click', () => {
						modal.Close()
						modals.fromYoutube.Open()
					})
					element.querySelector('button[data-name=folder]').addEventListener('click', async () => {
						modal.Close()
						const name = prompt('フォルダー名を入力してください')
						if (Boolean(name) === false) {
							return false
						}
						mainDirectoryViewer.MakeDir(name)
					})
				})
			modal.On('close', () => ChangeTitle())
		}
	},
	fileUpload: {
		Open: () => {
			const modal = new Modal()
				.SetTitle('ファイルをアップロード')
				.SetContent(document.querySelector('#fileUploadTemplate'))
				.Open(element => {
					ChangeTitle('ファイルをアップロード')
					const dropZone = element.querySelector('div[data-name=dropZone]')
					const fileInput = element.querySelector('input[data-name=fileSelect]')
					const fileNameInput = element.querySelector('input[data-name=filename]')
					const fileName = element.querySelector('span[data-name=fileName]')
					const fileSize = element.querySelector('span[data-name=fileSize]')
					const fileTime = element.querySelector('span[data-name=fileTime]')
					const uploadButton = element.querySelector('button[data-name=uploadBtn]')
					const formReturnButton = element.querySelector('button[data-name=FormReturn]')
					const FileChange = fileList => {
						const files = Array.from(fileList)
						let size = 0
						files.forEach(file => size += file.size)
						fileSize.innerText = util.ByteFormat(size)
						fileName.innerText = files.length === 1 ? files[0].name : `${files[0].name} ほか${files.length - 1}件のファイル`
						fileNameInput.value = files[0].name
						if (files.length === 1) {
							fileNameInput.removeAttribute('disabled')
						}
						else {
							fileNameInput.setAttribute('disabled', true)
						}
					}
					dropZone.addEventListener('dragover', e => {
						e.stopPropagation();
						e.preventDefault();
					}, false);

					dropZone.addEventListener('dragleave', e => {
						e.stopPropagation();
						e.preventDefault();
					}, false);

					dropZone.addEventListener('drop', e => {
						e.stopPropagation();
						e.preventDefault();
						const files = e.dataTransfer.files
						fileInput.files = files; //inputのvalueをドラッグしたファイルに置き換える。
						FileChange(files)
					}, false);

					fileInput.addEventListener('change', e => FileChange(fileInput.files), false);

					formReturnButton.addEventListener('click', e => {
						modal.Close()
						modals.fileUploadList.Open()
					})

					uploadButton.addEventListener('click', e => {
						if (fileInput.files.length === 0 && fileNameInput.value.length === 0) {
							alert('ファイルを選択してファイル名を入力してください')
							return false
						} else if (fileInput.files.length === 0) {
							alert('ファイルを選択してください')
							return false
						} else if (fileNameInput.value.length === 0) {
							alert('ファイル名を入力して下さい')
							return false
						}
						modal.Close()
						Array.from(fileInput.files).forEach(file => {
							new AddedFile(file, {
								name: fileInput.files.length === 1 ? fileNameInput.value : undefined
							})
								.Show()
								.Upload()
						})
					})
				})
			modal.On('close', () => ChangeTitle())
		}
	},
	fromYoutube: {
		Open: () => {
			const modal = new Modal()
				.SetTitle('Youtubeから追加')
				.SetContent(document.querySelector('#YoutubeTemplate'))
				.Open(element => {
					ChangeTitle('Youtubeから追加')
					element.querySelector('input[data-name=youtubeId]').addEventListener('change', async function () {
						const url = this.value;
						const preview = element.querySelector('iframe[data-name=youtubePreview]')
						const id = getURLVideoID(url)
						preview.src = `https://www.youtube.com/embed/${id}`

						const videoInfo = await (await fetch(`/api/youtube/info/${id}`)).json()

						const min = Math.floor(videoInfo.videoDetails.lengthSeconds / 60);
						const rem = Math.floor(videoInfo.videoDetails.lengthSeconds % 60);
						element.querySelector('span[data-name=videoTitle]').innerText = videoInfo.videoDetails.title
						element.querySelector('span[data-name=videoLengthSeconds]').innerText = `${min}分${rem}秒`
						element.querySelector('span[data-name=videoOwnerChannelName]').innerText = videoInfo.videoDetails.ownerChannelName

						if (!element.querySelector('input[data-name=filename]').value) {
							element.querySelector('input[data-name=filename]').value = videoInfo.videoDetails.title
						}
					})

					element.querySelector('button[data-name=FormReturn]').addEventListener('click', e => {
						modal.Close()
						modals.fileUploadList.Open()
					})

					element.querySelector('button[data-name=youtubeAddBtn]').addEventListener('click', function () {
						modal.Close()
						const url = element.querySelector('input[data-name=youtubeId]').value;
						const name = element.querySelector('input[data-name=filename]').value
						const type = element.querySelector('select.downloadType')
						const id = getURLVideoID(url)
						if (!id) {
							alert('無効なURLです')
							return false
						}
						new Toast('処理中です...(動画によっては数分かかります)', { color: 'blue', time: 3000 }).Show()
						const addedFile = new AddedFile(null, {
							name,
							type: '',
							openable: false
						}).Show()
						fetch(`/api/files/${mainDirectoryViewer.path + name}?source=youtube&id=${id}&type=${type.value}`, {
							method: 'POST'
						}).then(response => {
							const reader = response.body.getReader();
							// read() を呼ぶことで chunk を resolve する Promise が返る
							let nowDoing = 'audio'
							reader.read().then(async function processResult(result) {
								try {
									const progress = JSON.parse(new TextDecoder().decode(result.value).split('\n')[0])
									console.log(progress)
									if (progress.status === 'video download started') {
										nowDoing = 'video'
									} else if (progress.status === 'ended') {
										new Toast(`${name}を追加しました`, { color: 'green', time: '10000' }).Show()
										addedFile.DOM.querySelector('.filename').innerText = `${name}-完了`

										if (type !== 'audioonly') return
										const blob = await (await fetch(`files/${name}`)).blob();
										const fileObj = new File([blob], name, { type: 'audio/mp3' })
										addedFile.fileObj = fileObj
										addedFile.openable = true
									} else if (progress.status === 'audio video merging') {
										nowDoing = 'merging'
										addedFile.DOM.querySelector('.filename').innerText = `${name}-動画合成中`
									} else if (progress.status === 'progress') {
										addedFile.DOM.querySelector('.filename').innerText = `${name}-${nowDoing == 'audio' ? '音声' : '動画'}${progress.DownloadedPercent}%`
										addedFile.DOM.querySelector('progress').value = progress.floatDownloaded
									}
								} catch (e) {
									console.error(e)
								} finally {
									reader.read().then(processResult);
								}
							});
						})
					})
				})
			modal.On('close', () => ChangeTitle())
		},
	},
	backgroundSelect: {
		Open: () => {
			const modal = new Modal()
				.SetTitle('背景を選択')
				.SetContent(document.querySelector('#AddbackgroundTemplate'))
				.Open(async element => {
					const SetImages = async () => {
						const images = await (await fetch('/api/backgrounds/')).json()
						images.forEach(image => {
							const imgElement = document.createElement('button')
							imgElement.setAttribute('data-name', 'images')
							imgElement.style.backgroundImage = `url("/api/backgrounds/${image}")`
							imgElement.style.backgroundSize = 'cover'
							imgElement.classList.add('imageSelector')
							imgElement.addEventListener('click', () => SetBackgroundImage(image))
							element.querySelector('div[data-name=imageSelect]').appendChild(imgElement)
						})
					}
					const ClearImages = () => {
						Array.from(element.querySelectorAll('button[data-name=images]')).forEach(e => e.remove())
					}
					element.querySelector('button[data-name=imageAdd]').addEventListener('click', () => {
						element.querySelector('input[data-name=file]').click()
					})
					element.querySelector('button[data-name=imageClear]').addEventListener('click', () => SetBackgroundImage())

					element.querySelector('input[data-name=file]').addEventListener('change', () => {
						const file = element.querySelector('input[data-name=file]').files[0]
						const formData = new FormData()
						formData.append('filebody', file)
						fetch('/api/backgrounds/', {
							method: 'POST',
							body: formData
						})
							.then(res => res.text())
							.then(data => {
								if (!data === 'true') new Toast('失敗しました', { timeout: 5000, color: 'red' }).Show()
								ClearImages()
								SetImages()
							})
							.catch(err => new Toast('失敗しました', { timeout: 5000, color: 'red' }).Show())
					})
					SetImages()
				})
		}
	},
	settings: {
		Open: () => {
			const modal = new Modal()
				.SetTitle('設定')
				.Open(async element => {
					for (const [id, value] of Object.entries(userSettings)) {
						if (value.inputType == 'custom') {
							continue;
						}
						const clone = document.querySelector('#settingSimpleTemplate').content.cloneNode(true);
						clone.querySelector('.settingName').textContent = value.name
						clone.querySelector('.settingDescription').textContent = value.description
						const input = clone.querySelector('input')
						input.type = value.inputType
						value.ShowedCallback(input)
						input.addEventListener('change', e => value.Set(e))
						element.appendChild(clone)
					}
				})
		}
	}
}

const BASE_PATH = '/'
const FILES_ROOT = '/api/files/'
const BASE_URL = location.origin + '/'
const PATH_PARAMETER = decodeURIComponent(location.pathname.replace(BASE_PATH, ''))
const IS_BETA = new URL(location.href).searchParams.get('ver') === 'beta'
const MILLISECOND = 1000
let mousePosition = { x: 0, y: 0 }
let isUpload = false
let isFocus = true
let isSystemThemeChange
let fileUpdateIntervalms = localStorage.getItem('Interval') ?? 5000
const wait = async ms => new Promise(resolve => setTimeout(resolve, ms));
document.body.addEventListener("mousemove", e => {
	mousePosition.x = e.pageX;
	mousePosition.y = e.pageY;
});
window.addEventListener('beforeunload', event => {
	if (!userSettings.closeBeforeWarning.value) return
	if (event.cancelable === false) return
	event.preventDefault()
	event.returnValue = ''
})
window.matchMedia('(prefers-color-scheme: dark)').onchange = e => {
	if (!isSystemThemeChange) return false;
	const isDarkMode = e.matches;
	isDarkMode ? theme.Dark() : theme.Light();
}
window.addEventListener('focus', () => isFocus = true)
window.addEventListener('blur', () => isFocus = false)

const mainDirectoryViewer = new DirectoryViewer(filePath.GetPath(PATH_PARAMETER), { parentElement: document.querySelector(".directoryViewer.main") })
mainDirectoryViewer.ShowElements().UpdateFiles()
mainDirectoryViewer.On('updateDirectory', (files, length) => {
	document.getElementById('filelength').innerText = length
})
mainDirectoryViewer.On('changeDirectory', path => {
	const url = new URL(window.location);
	url.pathname = BASE_PATH + path
	window.history.replaceState(null, '', url.href);
})

const userSettings = {
	updateInterval: {
		name: 'ファイルの更新間隔',
		description: '指定した秒数ごとにファイル情報を更新します',
		value: util.StringToBool(localStorage.getItem('settings.updateInterval')) ?? 10 * MILLISECOND,
		inputType: 'number',
		Set(event) {
			if (event.target.value < 3) {
				event.target.value = 3
				return;
			}
			localStorage.setItem(`settings.updateInterval`, event.target.value * MILLISECOND)
			this.value = event.target.value * MILLISECOND
			clearInterval(fileUpdateInterval)
			fileUpdateInterval = setInterval(fileUpdateIntervalHandle, event.target.value * MILLISECOND)
		},
		ShowedCallback(inputElement) {
			inputElement.style.width = '80px'
			inputElement.min = 3
			inputElement.value = this.value / MILLISECOND
		}
	}, deepDarkMode: {
		name: '深い黒色を利用する',
		description: 'ダークモード時の黒をもっと暗くします',
		value: util.StringToBool(localStorage.getItem('settings.deepDarkMode')) ?? false,
		inputType: 'checkbox',
		Set(event) {
			localStorage.setItem(`settings.deepDarkMode`, event.target.checked)
			event.target.checked ? document.body.classList.add('deep-dark') : document.body.classList.remove('deep-dark')
			this.value = event.target.checked
		},
		ShowedCallback(inputElement) {
			inputElement.classList.add('toggleButton')
			inputElement.checked = this.value
		}
	}, closeBeforeWarning: {
		name: '終了時に警告',
		description: '終了時にダイアログを表示する(可能な場合)',
		value: util.StringToBool(localStorage.getItem('settings.closeBeforeWarning')) ?? false,
		inputType: 'checkbox',
		Set(event) {
			localStorage.setItem(`settings.closeBeforeWarning`, event.target.checked)
			this.value = event.target.checked
		},
		ShowedCallback(inputElement) {
			inputElement.classList.add('toggleButton')
			inputElement.checked = this.value
		}
	}, forcedFileUpdate: {
		name: '常時ファイル情報を更新',
		description: 'タブにフォーカスされていなくても更新されます',
		value: util.StringToBool(localStorage.getItem('settings.forcedFileUpdate')) ?? false,
		inputType: 'checkbox',
		Set(event) {
			localStorage.setItem(`settings.forcedFileUpdate`, event.target.checked)
			this.value = event.target.checked
		},
		ShowedCallback(inputElement) {
			inputElement.classList.add('toggleButton')
			inputElement.checked = this.value
		}
	}, videoAutoLoop: {
		name: '動画の自動ループ',
		description: '動画、音声を自動的にループをオンにします',
		value: util.StringToBool(localStorage.getItem('settings.videoAutoLoop')) ?? true,
		inputType: 'checkbox',
		Set(event) {
			localStorage.setItem(`settings.videoAutoLoop`, event.target.checked)
			this.value = event.target.checked
		},
		ShowedCallback(inputElement) {
			inputElement.classList.add('toggleButton')
			inputElement.checked = this.value
		}
	}, videoAutoPlay: {
		name: '動画の自動再生',
		description: '動画、音声を自動的に再生します(音量注意)',
		value: util.StringToBool(localStorage.getItem('settings.videoAutoPlay')) ?? false,
		inputType: 'checkbox',
		Set(event) {
			localStorage.setItem(`settings.videoAutoPlay`, event.target.checked)
			this.value = event.target.checked
		},
		ShowedCallback(inputElement) {
			inputElement.classList.add('toggleButton')
			inputElement.checked = this.value
		}
	}
}

const filetypes = {
	folder: {
		iconPath: '/src/ico/folder.svg',
	}, default: {
		iconPath: '/src/ico/file.svg',
	}, audio: {
		fileViewer: '',
		filePreviewer: '',
		iconPath: '/src/ico/audiofile.svg',
	}, video: {
		fileViewer: '',
		filePreviewer: '',
		iconPath: '/src/ico/movie.svg',
	}, pdf: {
		fileViewer: '',
		filePreviewer: '',
		iconPath: '/src/ico/textfile.svg',
	}, img: {
		fileViewer: '',
		filePreviewer: '',
		iconPath: '/src/ico/image.svg',
	}, markdown: {
		fileViewer: '',
		filePreviewer: null,
		iconPath: '/src/ico/textfile.svg',
	}, code: {
		fileViewer: '',
		filePreviewer: null,
		iconPath: '/src/ico/textfile.svg',
	}, zip: {
		fileViewer: null,
		filePreviewer: null,
		iconPath: '/src/ico/zipfile.svg',
	}, presentation: {
		fileViewer: null,
		filePreviewer: null,
		iconPath: '/src/ico/presentationfile.svg'
	}, exe: {
		fileViewer: null,
		filePreviewer: null,
		iconPath: '/src/ico/commandline.svg'
	}
}

const extensions = {
	//拡張子なし
	['']: {
		description: 'ファイル',
		openable: false,
		type: filetypes.default
	},
	// 音声ファイル
	mp3: {
		description: 'MPEG Audio Layer-3 音声ファイル',
		openable: true,
		type: filetypes.audio
	}, ogg: {
		description: 'ogg 音声ファイル',
		openable: true,
		type: filetypes.audio
	}, oga: {
		description: 'oga 音声ファイル',
		openable: false,
		type: filetypes.audio
	}, wav: {
		description: 'wav 音声ファイル',
		openable: true,
		type: filetypes.audio
	}, wma: {
		description: 'Windows Media Audio 音声ファイル',
		openable: false,
		type: filetypes.audio
	}, m4a: {
		description: 'MPEG-4 音声ファイル',
		openable: true,
		type: filetypes.audio
	}, mka: {
		description: 'Matroska 音声ファイル',
		openable: true,
		type: filetypes.audio
	},
	// 動画ファイル
	mp4: {
		description: 'MPEG-4 動画ファイル',
		openable: true,
		type: filetypes.video
	}, mpg: {
		description: 'MPEG-1,2 動画ファイル',
		openable: true,
		type: filetypes.video
	}, mpeg: {
		description: 'MPEG-1,2 動画ファイル',
		openable: true,
		type: filetypes.video
	}, avi: {
		description: 'Audio Video Interleave 動画ファイル',
		openable: true,
		type: filetypes.video
	}, wmv: {
		description: 'Windows Media Video 動画ファイル',
		openable: false,
		type: filetypes.video
	}, ogv: {
		description: 'oga 動画ファイル',
		openable: true,
		type: filetypes.video
	}, ts: {
		description: 'ts 動画ファイル',
		openable: true,
		type: filetypes.video
	}, webm: {
		description: 'webm 動画ファイル',
		openable: true,
		type: filetypes.video
	}, mkv: {
		description: 'Matroska 動画ファイル',
		openable: true,
		type: filetypes.video
	}, mov: {
		description: 'QuickTime 動画ファイル',
		openable: true,
		type: filetypes.video
	}, m2ts: {
		description: 'QuickTime 動画ファイル',
		openable: true,
		type: filetypes.video
	}, mts: {
		description: 'QuickTime 動画ファイル',
		openable: true,
		type: filetypes.video
	}, m2t: {
		description: 'QuickTime 動画ファイル',
		openable: true,
		type: filetypes.video
	},
	// 画像ファイル
	jpg: {
		description: 'JPEG 非可逆圧縮画像ファイル',
		openable: true,
		type: filetypes.img
	}, jpeg: {
		description: 'JPEG 非可逆圧縮画像ファイル',
		openable: true,
		type: filetypes.img
	}, jp2: {
		description: 'JPEG 2000 ファイル',
		openable: false,
		type: filetypes.img
	}, j2k: {
		description: 'JPEG 2000 ファイル',
		openable: false,
		type: filetypes.img
	}, hdp: {
		description: 'HD Photo ファイル',
		openable: false,
		type: filetypes.img
	}, wdp: {
		description: 'Windows Media Photo ファイル',
		openable: false,
		type: filetypes.img
	}, jxr: {
		description: 'JPEG XR ファイル',
		openable: false,
		type: filetypes.img
	}, png: {
		description: 'Portable Network Graphics 可逆圧縮画像ファイル',
		openable: true,
		type: filetypes.img
	}, apng: {
		description: 'Portable Network Graphics アニメーション画像ファイル',
		openable: true,
		type: filetypes.img
	}, gif: {
		description: 'Graphics Interchange Format アニメーション画像ファイル',
		openable: true,
		type: filetypes.img
	}, tiff: {
		description: 'Tagged Image File Format 画像ファイル',
		openable: true,
		type: filetypes.img
	}, tif: {
		description: 'Tagged Image File Format 画像ファイル',
		openable: true,
		type: filetypes.img
	}, gif: {
		description: 'windowsビットマップ 画像ファイル',
		openable: true,
		type: filetypes.img
	}, gif: {
		description: 'ベクター形式 画像ファイル',
		openable: true,
		type: filetypes.img
	}, webp: {
		description: 'WebP 画像ファイル',
		openable: true,
		type: filetypes.img
	}, avif: {
		description: 'AV1 画像ファイル',
		openable: true,
		type: filetypes.img
	}, heic: {
		description: 'High Efficiency 画像ファイル',
		openable: true,
		type: filetypes.img
	}, svg: {
		description: 'ベクター画像ファイル',
		openable: true,
		type: filetypes.img
	},
	// PDF
	pdf: {
		description: 'PDF ドキュメント',
		openable: false,
		type: filetypes.pdf
	},
	// 圧縮ファイル
	['7z']: {
		description: '7-Zip 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	},
	zip: {
		description: 'ZIP 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, gz: {
		description: 'gz 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, gzip: {
		description: 'gz 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, rar: {
		description: 'rar 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, bz2: {
		description: 'bzip2 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, bzip2: {
		description: 'bzip2 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, lzh: {
		description: 'lzh 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, cab: {
		description: 'キャビネット 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	}, sit: {
		description: 'sit 圧縮ファイル',
		openable: false,
		type: filetypes.zip
	},
	//プレゼンテーションファイル
	pptx: {
		description: 'PowerPoint プレゼンテーションファイル',
		openable: false,
		type: filetypes.presentation
	}, pptm: {
		description: 'PowerPoint マクロ有効プレゼンテーションファイル',
		openable: false,
		type: filetypes.presentation
	}, ppt: {
		description: 'PowerPoint 97-2003 プレゼンテーションファイル',
		openable: false,
		type: filetypes.presentation
	}, key: {
		description: 'Keynote プレゼンテーションファイル',
		openable: false,
		type: filetypes.presentation
	}, potx: {
		description: 'PowerPoint テンプレートファイル',
		openable: false,
		type: filetypes.presentation
	},
	// ソースコード
	md: { description: 'MarkDown ソースファイル', openable: true, type: filetypes.code },
	txt: { description: 'テキストファイル', openable: true, type: filetypes.code },
	js: { description: 'JavaScript ソースファイル', openable: true, type: filetypes.code },
	html: { description: 'HTML ソースファイル', openable: true, type: filetypes.code },
	shtml: { description: 'SSI HTML ソースファイル', openable: true, type: filetypes.code },
	htm: { description: 'HTML ソースファイル', openable: true, type: filetypes.code },
	xml: { description: 'XML ソースファイル', openable: true, type: filetypes.code },
	css: { description: 'カスケードスタイルシート ソースファイル', openable: true, type: filetypes.code },
	php: { description: 'PHP ソースファイル', openable: true, type: filetypes.code },
	yaml: { description: 'YAML ソースファイル', openable: true, type: filetypes.code },
	py: { description: 'Python ソースファイル', openable: true, type: filetypes.code },
	wasm: { description: 'WebAssembly ソースファイル', openable: true, type: filetypes.code },
	json: { description: 'JSON ソースファイル', openable: true, type: filetypes.code },
	json5: { description: 'JSON(5) ソースファイル', openable: true, type: filetypes.code },
	c: { description: 'C ソースファイル', openable: true, type: filetypes.code },
	cc: { description: 'C++ ソースファイル', openable: true, type: filetypes.code },
	cp: { description: 'Apple Xcode C++ ソースファイル', openable: true, type: filetypes.code },
	cpp: { description: 'C++ ソースファイル', openable: true, type: filetypes.code },
	cxx: { description: 'C++ ソースファイル', openable: true, type: filetypes.code },
	rb: { description: 'Ruby ソースファイル', openable: true, type: filetypes.code },
	swift: { description: 'Swift ソースファイル', openable: true, type: filetypes.code },
	h: { description: 'C,C++(ヘッダー) ソースファイル', openable: true, type: filetypes.code },
	graphql: { description: 'GraphQL ソースファイル', openable: true, type: filetypes.code },
	gql: { description: 'GraphQL ソースファイル', openable: true, type: filetypes.code },
	rs: { description: 'Rust ソースファイル', openable: true, type: filetypes.code },
	go: { description: 'Go ソースファイル', openable: true, type: filetypes.code },
	java: { description: 'Java ソースファイル', openable: true, type: filetypes.code },
	sql: { description: 'sql ソースファイル', openable: true, type: filetypes.code },
	pl: { description: 'Perl ソースファイル', openable: true, type: filetypes.code },
	bat: { description: 'Windows バッチファイル', openable: true, type: filetypes.code },
	ps1: { description: 'Windows PowerShell バッチファイル', openable: true, type: filetypes.code },
	sh: { description: 'Unix シェル', openable: true, type: filetypes.code },
	toml: { description: 'TOML 設定ファイル', openable: true, type: filetypes.code },
	cfg: { description: '設定ファイル', openable: true, type: filetypes.code },
	conf: { description: '設定ファイル', openable: true, type: filetypes.code },
	conf: { description: '設定ファイル', openable: true, type: filetypes.code },
	ini: { description: '構成ファイル', openable: true, type: filetypes.code },
	//実行ファイル
	exe: { description: 'windows 実行ファイル', openable: false, type: filetypes.exe },
	pif: { description: 'Program Information File', openable: false, type: filetypes.exe },
	com: { description: 'MS-DOS 実行ファイル', openable: false, type: filetypes.exe },
	com: { description: 'Mac OS X 実行ファイル', openable: false, type: filetypes.exe },
}

const sidebar = {
	icons: {
		top: [
			{
				iconPath: '/src/ico/bars3.svg',
				text: ' ',
				onClick: () => {
					if (document.querySelector('.sidebar').dataset.state === 'open') {
						sidebar.Close()
					} else {
						sidebar.Open()
					}
				}
			}, {
				iconPath: '/src/ico/folder.svg',
				text: 'ファイル',
				onClick: () => { }
			}, {
				iconPath: '/src/ico/arrow_up_tray.svg',
				text: '追加したファイル',
				onClick: () => { },
				DetailElementHandle(element) {

				}
			}, {
				iconPath: '/src/ico/star.svg',
				text: 'お気に入り',
				onClick: () => { },
				DetailElementHandle(element) {
					const Update = () => {
						element.innerHTML = ''
						FavoriteManager.list.forEach(fileName => {
							const fileManager = new FileManager(fileName)
							const fileUI = new FileUIBase(decodeURIComponent(fileName))
							const fileElement = document.createElement('button')
							fileElement.classList.add('sideButton')
							fileElement.addEventListener('click', () => {
								fileUI.Open()
							})
							fileElement.addEventListener('contextmenu', e => {
								e.preventDefault()
								fileUI.Context()
							})

							const textIconRapper = document.createElement('div')
							textIconRapper.classList.add('sideButton_textIconRapper')
							fileElement.appendChild(textIconRapper)

							const icon = document.createElement('div')
							icon.classList.add('sideButton_icon')
							icon.style.webkitMaskImage = `url(${extensions[fileManager.filePath.extension.toLowerCase()]?.type.iconPath ?? filetypes.default.iconPath})`
							icon.style.maskImage = `url(${extensions[fileManager.filePath.extension.toLowerCase()]?.type.iconPath ?? filetypes.default.iconPath})`
							textIconRapper.appendChild(icon)

							const text = document.createElement('span')
							text.classList.add('sideButton_text')
							text.innerText = decodeURIComponent(fileManager.filePath.name)
							textIconRapper.appendChild(text)
							element.appendChild(fileElement)
						})
					}
					Update()
					FavoriteManager.list = util.ReturnWatchArray(FavoriteManager.list, Update)
				}
			},
		],
		bottom: [
			{
				iconPath: '/src/ico/setting.svg',
				text: '設定',
				onClick: () => {
					new ContextMenu({
						menuList: [
							{
								text: "ページの再読み込み",
								onClick: () => location.reload(),
								icon: '/src/ico/reload.svg'
							}, {
								type: 'line'
							}, {
								text: "テーマ",
								submenu: [
									{
										text: "ライトテーマ",
										onClick: theme.Light,
										icon: '/src/ico/sun.svg'
									}, {
										text: "ダークテーマ",
										onClick: theme.Dark,
										icon: '/src/ico/moon.svg'
									}, {
										text: "システムのテーマ",
										onClick: theme.System
									},
								],
								icon: '/src/ico/chevron-right.svg'
							}, {
								type: 'line'
							}, {
								text: "設定",
								onClick: modals.settings.Open,
								icon: '/src/ico/setting.svg'
							}, {
								text: "背景画像",
								onClick: modals.backgroundSelect.Open,
								icon: '/src/ico/image.svg'
							}
						]
					}).Show()
				}
			}
		],
	},
	Open() {
		document.querySelector('.sidebar').dataset.state = 'open'
	},
	Close() {
		document.querySelector('.sidebar').dataset.state = 'close'
	}
}

for (const [key, value] of Object.entries(sidebar.icons)) {
	value.forEach(iconSetting => {
		const button = document.createElement('button')
		button.classList.add('sideButton')
		button.addEventListener('click', iconSetting.onClick)

		const textIconRapper = document.createElement('div')
		textIconRapper.classList.add('sideButton_textIconRapper')
		button.appendChild(textIconRapper)

		const icon = document.createElement('div')
		icon.classList.add('sideButton_icon')
		icon.style.webkitMaskImage = `url(${iconSetting.iconPath})`
		icon.style.maskImage = `url(${iconSetting.iconPath})`
		textIconRapper.appendChild(icon)

		const text = document.createElement('span')
		text.classList.add('sideButton_text')
		text.innerText = iconSetting.text
		textIconRapper.appendChild(text)

		document.querySelector(`.sidebar_icons_${key}`).appendChild(button)

		if (iconSetting.DetailElementHandle) {
			const expandButton = document.createElement('button')
			expandButton.classList.add('sideButton_icon', 'sideButton_expandButton')
			expandButton.style.webkitMaskImage = `url(/src/ico/chevron-up.svg)`
			expandButton.style.maskImage = `url(/src/ico/chevron-up.svg)`
			expandButton.style.rotate = '180deg'
			button.appendChild(expandButton)

			const detailElement = document.createElement('div')
			detailElement.classList.add('sideButton_detail')
			detailElement.style.display = 'none'
			document.querySelector(`.sidebar_icons_${key}`).appendChild(detailElement)

			let isExpanded = false
			expandButton.addEventListener('click', () => {
				if (isExpanded === true) {
					detailElement.style.display = 'none'
					expandButton.style.rotate = '180deg'
					isExpanded = false
				} else if (isExpanded === false) {
					detailElement.style.display = null
					detailElement.animate(
						[
							{ opacity: 0, transform: 'translateY(-20px)' },
							{ opacity: 1, transform: 'translateY(0px)' }
						], {
						duration: 200, //再生時間（ミリ秒）
						easing: 'cubic-bezier(0.25, 1, 0.5, 1)', //イージング
					})
					expandButton.style.rotate = '0deg'
					isExpanded = true
				}
			})

			iconSetting.DetailElementHandle(detailElement)
		}
	})
}

const ChangeTitle = name => {
	document.title = name ? `${name} | ファイル置き場` : 'ファイル置き場'
}

const fileUpdateIntervalHandle = () => {
	if ((document.visibilityState === 'visible' || userSettings.forcedFileUpdate.value) === false) return
	mainDirectoryViewer.UpdateFiles()
}

let fileUpdateInterval = setInterval(fileUpdateIntervalHandle, userSettings.updateInterval.value)

const theme = {
	Light: () => {
		document.body.classList.add('light-mode')
		document.body.classList.remove('dark-mode')
		util.ThemeColor('#f4f4f4')
		localStorage.setItem('theme', 'light')
	},
	Dark: () => {
		document.body.classList.add('dark-mode')
		document.body.classList.remove('light-mode')
		util.ThemeColor('#2a2a2a')
		localStorage.setItem('theme', 'dark')
	},
	System: () => {
		isSystemThemeChange = true
		window.matchMedia('(prefers-color-scheme: dark)').matches ? theme.Dark() : theme.Light()
		localStorage.setItem('theme', 'system')
	}
}

const SetBackgroundImage = url => {
	if (url) {
		document.body.classList.add('using-background-image')
		util.Css(`body.using-background-image .body::before {background-image:url("/api/backgrounds/${url}")}`)
		localStorage.setItem('background-image', url)
	}
	else {
		document.body.classList.remove('using-background-image')
		localStorage.removeItem('background-image')
	}
}

switch (localStorage.getItem('theme')) {
	case 'light':
		theme.Light()
		break;
	case 'dark':
		theme.Dark()
		break;
	case 'system':
		theme.System()
		break
	default:
		theme.System()
		break;
}

if (userSettings.deepDarkMode.value) {
	document.body.classList.add('deep-dark')
}

SetBackgroundImage(localStorage.getItem('background-image'))

document.addEventListener('DOMContentLoaded', async () => {
	const sidebarElements = document.querySelector('.sidebar')
	const sidebarIcons = document.querySelector('.sidebar_icons')
	const sidebarDragArea = document.querySelector('.sidebar_dragArea')
	const ButtonRapper = document.querySelector('.sidebar_toggle')
	const sidebarWidth = localStorage.getItem('sidebar.width')

	if (sidebarWidth) {
		sidebarIcons.style.width = sidebarWidth + 'px'
		sidebarElements.dataset.width = sidebarWidth
	}

	sidebarDragArea.addEventListener('mousedown', (event) => {
		document.body.style.userSelect = 'none'
		sidebarIcons.style.transition = 'none'

		const startPosition = mousePosition.x
		const startWidth = sidebarElements.offsetWidth

		if (startWidth > document.body.offsetWidth / 2) {
			sidebarIcons.style.width = document.body.offsetWidth / 2 + 'px'
		}

		const mousemoveHandle = event => {
			const offset = mousePosition.x - startPosition
			const width = startWidth + offset
			if (width > document.body.offsetWidth / 2) return
			sidebarIcons.style.width = width + 'px'
			sidebarElements.dataset.width = width
		}

		document.addEventListener('mousemove', mousemoveHandle);
		document.addEventListener('mouseup', event => {
			document.body.style.userSelect = null
			sidebarIcons.style.transition = null
			localStorage.setItem('sidebar.width', sidebarElements.dataset.width)
			document.removeEventListener('mousemove', mousemoveHandle);
		}, { once: true })
	})
	sidebarDragArea.addEventListener('dblclick', (event) => {
		sidebarIcons.style.width = '250px'
		sidebarElements.dataset.width = 250
		localStorage.setItem('sidebar.width', null)
	})
	if (IS_BETA) {
		document.querySelector('.version').style.display = null
	}
})

window.addEventListener('load', async () => {
	if (filePath.GetName(PATH_PARAMETER)) {
		const targetFile = new FileManager(PATH_PARAMETER)
		await targetFile.IsExits() ?
			new UploadedFileOld(PATH_PARAMETER).Open() :
			new Toast('指定されたファイルURLを開けませんでした', { color: 'red' }).Show()
	}
})
