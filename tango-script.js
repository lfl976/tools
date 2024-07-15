const wordList = ["hello", "world"];
const importBtn = document.getElementById("importBtn");
const radioButtons = document.querySelectorAll('input[name="storage"]');
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`;
const isRemote = localStorage.getItem("storageOption") === "remote";
const remote = document.getElementById("remote");
const local = document.getElementById("local");
const wordListElement = document.getElementById("wordList");
const googleAppScriptId = document.getElementById("googleAppScriptId");
let localAppScriptId = localStorage.getItem("appScriptIdForWordList");
let url = `https://script.google.com/macros/s/${localAppScriptId}/exec`;

if (isRemote) {
	remote.checked = true;
	googleAppScriptId.classList.remove("hidden");
}
if (localAppScriptId) {
	googleAppScriptId.value = localAppScriptId;
}

async function addWord(self) {
	const wordInput = document.getElementById("wordInput");
	const word = wordInput.value.trim();
	if (word) {
		self.disabled = true;
		await getPronounce(word);
		self.disabled = false;
		wordInput.value = "";
	}
}

let db;
const request = indexedDB.open("WordList", 1);

request.onerror = (event) => {
	console.log("Database error: " + event.target.errorCode);
};

request.onsuccess = (event) => {
	db = event.target.result;
	console.log("Database opened successfully");
	console.log("isRemote", isRemote);
	refreshList();
};

request.onupgradeneeded = (event) => {
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
	data.forEach((item) => {
		const word = { reading: item.kana, word: item.surface };
		if (remote.checked) {
			syncDataToGoogleSheet(word);
		} else {
			addData(word);
		}
		addWordToList(word);
	});
}

function addWordToList(item) {
	const li = document.createElement("li");
	li.dataset.word = item.word;
	li.dataset.reading = item.reading;
	li.innerHTML =
		`<ruby>${item.word}<rp>(</rp><rt>${item.reading}</rt><rp>)</rp></ruby>` +
		icon;
	wordListElement.appendChild(li);
}

async function updateListFromLocal() {
	const list = await getAllData();
	if (list.length === 0) {
		importBtn.classList.remove("hidden");
	} else {
		importBtn.classList.add("hidden");
	}
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

wordListElement.addEventListener("click", (event) => {
	const target = event.target;
	if (target.tagName === "LI") {
		const word = target.dataset.word;
		speakText(word);
	}
});

async function exportWordList() {
	const list = await getAllData();
	const wordList = list.map((item) => ({
		reading: item.reading,
		word: item.word,
	}));
	const data = JSON.stringify(wordList);
	const blob = new Blob([data], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "wordList.json";
	a.click();
	URL.revokeObjectURL(url);
}

async function importWordList() {
	const url =
		"https://raw.githubusercontent.com/lfl976/tools/main/wordList.json";
	const response = await fetch(url);
	const data = await response.json();
	data.forEach((item) => {
		addData(item);
	});
	updateListFromLocal();
}

function importWordListFromLocal() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json";
	input.onchange = async (event) => {
		const file = event.target.files[0];
		const reader = new FileReader();
		reader.onload = async (event) => {
			const data = event.target.result;
			const list = JSON.parse(data);
			list.forEach((item) => {
				addData(item);
				addWordToList(item);
			});
		};
		reader.readAsText(file);
	};
	input.click();
}

function clearList() {
	wordListElement.innerHTML = "";
	const transaction = db.transaction(["words"], "readwrite");
	const objectStore = transaction.objectStore("words");
	objectStore.clear();
	// indexedDB.deleteDatabase("WordList");
}

function getDataFromGoogleSheet() {
	// const url =
	// 	"https://script.google.com/macros/s/AKfycbz8j1o0Xs6oI7Zv1v1V4Y7XyQ0LJWw0G8y9z9z6Lw/exec";
	if (!localAppScriptId) {
		alert("Please enter Google App Script ID");
		return;
	}

	fetch(url)
		.then((response) => response.json())
		.then((data) => {
			console.log("Data", data);
			data.forEach((item) => {
				addWordToList({ word: item[0], reading: item[1] });
			});
		});
}

function syncDataToGoogleSheet(word) {
	if (!localAppScriptId) {
		alert("Please enter Google App Script ID");
		return;
	}

	const data = {
		value1: word.word,
		value2: word.reading,
	};

	fetch(url, {
		method: "POST",
		mode: "no-cors",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	})
		.then((response) => response.text())
		.then((data) => {
			console.log("Success:", data);
		})
		.catch((error) => {
			console.error("Error:", error);
		});
}

radioButtons.forEach((radio) => {
	radio.addEventListener("change", function () {
		const storageOption = document.querySelector(
			'input[name="storage"]:checked'
		).value;
		localStorage.setItem("storageOption", storageOption);
		refreshList();
		if (storageOption === "remote") {
			googleAppScriptId.classList.remove("hidden");
		} else {
			googleAppScriptId.classList.add("hidden");
		}
	});
});

function refreshList() {
	wordListElement.innerHTML = "";
	if (remote.checked) {
		getDataFromGoogleSheet();
	} else {
		updateListFromLocal();
	}
}

googleAppScriptId.addEventListener("change", () => {
	localStorage.setItem("appScriptIdForWordList", googleAppScriptId.value);
	localAppScriptId = localStorage.getItem("appScriptIdForWordList");
	url = `https://script.google.com/macros/s/${localAppScriptId}/exec`;
	refreshList();
});
