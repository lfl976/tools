const wordList = ["hello", "world"];
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`;

async function addWord(self) {
	console.log("Add word");
	console.log(self);
	const wordInput = document.getElementById("wordInput");
	const word = wordInput.value.trim();
	if (word) {
		self.disabled = true;
		await getPronounce(word);
		self.disabled = false;
		wordInput.value = "";
	}
}

function updateWordList() {
	const wordListElement = document.getElementById("wordList");
	wordListElement.innerHTML = "";
	wordList.forEach((word, index) => {
		const li = document.createElement("li");
		li.textContent = word;
		wordListElement.appendChild(li);
	});
}

let db;
const request = indexedDB.open("WordList", 1);

request.onerror = (event) => {
	console.log("Database error: " + event.target.errorCode);
};

request.onsuccess = (event) => {
	db = event.target.result;
	console.log("Database opened successfully");
	// addData({ reading: "いのり", word: "祈り" });
	updaateList();
};

request.onupgradeneeded = (event) => {
	console.log("event", event);
	db = event.target.result;
	console.log("Database upgrade needed");
	const objectStore = db.createObjectStore("words", {
		keyPath: "id",
		autoIncrement: true,
	});
	objectStore.createIndex("reading", "reading", { unique: false });
	objectStore.createIndex("word", "word", { unique: false });
};

function deleteDatabase() {
	let deleteRequest = indexedDB.deleteDatabase("WordList");
	console.log("Database deletion started");
	deleteRequest.onsuccess = (event) => {
		console.log("Database deleted successfully");
	};
}

const addData = (data) => {
	const transaction = db.transaction(["words"], "readwrite");
	const objectStore = transaction.objectStore("words");
	const request = objectStore.add(data);

	request.onsuccess = () => {
		console.log("Data added successfully");
	};

	request.onerror = (event) => {
		console.log("Data addition failed: " + event.target.errorCode);
	};
};

async function getAllData() {
	const transaction = db.transaction(["words"], "readonly");
	const objectStore = transaction.objectStore("words");
	const request = objectStore.getAll();

	return new Promise((resolve, reject) => {
		request.onsuccess = () => {
			console.log("Data retrieved successfully");
			console.log(request.result);
			resolve(request.result);
		};

		request.onerror = () => {
			console.log("Data retrieval failed: " + event.target.errorCode);
			reject([]);
		};
	});
}

async function getPronounce(word) {
	const params = new URLSearchParams({});
	params.set("text", word);
	const url = `https://kanji2kana-service.vercel.app/tokenize?${params.toString()}`;
	const response = await fetch(url);
	const data = await response.json();
	console.log("Translated data", data);
	if (data.length > 0) {
		const word = { reading: data[0].kana, word: data[0].surface };
		addData(word);
		addWordToList(word);
	}
}

function addWordToList(item) {
	const wordListElement = document.getElementById("wordList");
	const li = document.createElement("li");
	li.dataset.word = item.word;
	li.dataset.reading = item.reading;
	li.innerHTML =
		`<ruby>${item.word}<rp>(</rp><rt>${item.reading}</rt><rp>)</rp></ruby>` +
		icon;
	wordListElement.appendChild(li);
}

async function updaateList() {
	const list = await getAllData();
	console.log("List", list);

	list.forEach((item) => {
		addWordToList(item);
	});
}

// 创建一个新的语音合成实例
const synth = window.speechSynthesis;

// 创建一个函数来朗读文本
function speakText(text, lang = "ja-JP") {
	// 创建一个新的语音合成消息
	const utterance = new SpeechSynthesisUtterance(text);

	// 设置朗读的语言
	utterance.lang = lang;
	// 开始朗读文本
	synth.speak(utterance);
}

const wordListElement = document.getElementById("wordList");
wordListElement.addEventListener("click", (event) => {
	const target = event.target;
	// console.log("target", target);
	if (target.tagName === "LI") {
		const word = target.dataset.word;
		speakText(word);
	}
});
