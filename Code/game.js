// declare variables
let p1_hand = []; let p2_hand = [];
let p1_point = 0; let p2_point = 0;
let p1_selected_card = []; let p2_selected_card = [];
let dropped_cards_p1 = []; let dropped_cards_p2 = [];
let time = "game";
let p1_is_acting = false;
// define game state
const card_num = 8;
let WIN_POINT = 100;
let WIN_TURN = 5;
let numTurn = 1;
let turn = "p1";
// define constant variables
const elementToNumber = {"H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8, "F": 9, "Ne": 10,"Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15, "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20,"Fe": 26, "Cu": 29, "Zn": 30, "I": 53};
const elements = [...Array(6).fill('H'), ...Array(4).fill('O'), ...Array(4).fill('C'),'He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca','Fe', 'Cu', 'Zn', 'I'];
const element = ['H','O','C','He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca','Fe', 'Cu', 'Zn', 'I'];
let MineTurn = null;
let myXP = 0;




// ========== firebase authentication/dataset settings ==========
// firebase Realtime DB config
const firebaseConfig = {
    apiKey: "AIzaSyC0XCxBLbxSg9JVsv8RM89P5N2uLUyonOI",
    authDomain: "elementbattle3-54850.firebaseapp.com",
    projectId: "elementbattle3-54850",
    storageBucket: "elementbattle3-54850.appspot.com",
    messagingSenderId: "192129204644",
    appId: "1:192129204644:web:a585308d0e2927648e8131",
    measurementId: "G-4DX8BD16PN"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
function getRandomName() {
    const animals = ["cat", "dog", "bird", "bear", "monkey", "fox", "deer", "penguin"];
    const rand = animals[Math.floor(Math.random() * animals.length)] + Math.floor(Math.random() * 1000);
    return rand;
}
auth.onAuthStateChanged(async (authUser) => {
    if (!authUser) return;

    const playerRef = database.ref(`players/${authUser.uid}`);
    const snapshot  = await playerRef.once('value');
    let name = snapshot.child('Name').val();
    let rate = snapshot.child('Rate').val();

    if (!snapshot.exists()) {
        name = getRandomName();
        await playerRef.set({
            IsSearched : false,
            PeerID     : '',
            Name       : name,
            Rate       : 100,
            myXP       : 0
        });
        rate = 100;  // 新規ユーザーならrateも初期値にする
    } else if (!name) {
        name = getRandomName();
        await playerRef.update({ Name: name, IsSearched: false });
    } else if (!snapshot.child('IsSearched').exists()) {
        await playerRef.update({ IsSearched: false });
    }

    // 最初の画面反映
    document.getElementById('UserNameTag').textContent = `名前： ${name}`;
    document.getElementById('my-rate').textContent = `現在のレート： ${rate}`;
    document.getElementById('rankmatchModal').style.display = 'block';


    // 自分のレートのリアルタイム更新監視
    playerRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        const currentRate = userData ? userData.Rate : 0;
        document.getElementById('my-rate').textContent = `現在のレート： ${currentRate}`;
    });

    // 全体のランキングのリアルタイム更新監視
    const playersRef = database.ref('players/');
    playersRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();

            const playersArray = Object.entries(data).map(([userId, playerData]) => ({
                userId,
                name: playerData.Name || "名無し",
                rate: playerData.Rate || 0
            }));

            playersArray.sort((a, b) => b.rate - a.rate);
            const top10 = playersArray.slice(0, 10);

            showRanking(top10);
        } else {
            console.log("プレイヤーデータが存在しません");
        }
    }, (error) => {
        console.error("データ取得エラー:", error);
    });
});

// ======== login Modal =======
// firebase authentication functions
function logout() {
    auth.signOut();
    document.getElementById("UserDataModal").style.display = "none";
    document.getElementById("LoginModal").style.display = "block";
}
document.getElementById("user_icon").addEventListener("click", function () {
    //closeRules();
    //closeWinSettings();
    //closePeerModal();
    document.getElementById("UserDataMessage").innerHTML = "";
    document.getElementById("name-change").value = "";
    const user = firebase.auth().currentUser;
    let modal;
    if (user) {modal = document.getElementById("UserDataModal");} else {modal = document.getElementById("LoginModal");}
    modal.style.display = "inline";
});
// モーダル外をクリック / タップした場合に閉じる
function handleOutsideClick_LoginModal(event) {
    const user = firebase.auth().currentUser;
    let modal;
    if (user) {modal = document.getElementById("UserDataModal");} else {modal = document.getElementById("LoginModal");}
    if (!modal.contains(event.target)) closeLoginModal();
}
// Google login
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
    .then((result) => {
        const user = result.user;
        console.log("Google login success:", user);
        document.getElementById("LoginModal").style.display = "none";
        document.getElementById("UserDataModal").style.display = "block";
        startPeer(); // or any function you want to call after login
    })
    .catch((error) => {
        console.error("Google login failed: ", error);
        alert("Googleログインに失敗しました");
    });
}
// Sign up with email & password
function SignUpWithMail() {
    const email = prompt("メールアドレスを入力してください:");
    const password = prompt("パスワードを入力してください（6文字以上）:");
    
    if (!email || !password) {
        alert("メールアドレスとパスワードを入力してください");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        console.log("サインアップ成功:", user);
        alert("サインアップ成功しました");
        startPeer(); // optional if you want to start after signup
    })
    .catch((error) => {
        console.error("サインアップ失敗:", error);
        alert("サインアップに失敗しました: " + error.message);
    });
}
// Login with email & password
function loginWithMail() {
    const email = prompt("メールアドレスを入力してください:");
    const password = prompt("パスワードを入力してください:");
    
    if (!email || !password) {
        alert("メールアドレスとパスワードを入力してください");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        console.log("ログイン成功:", user);
        alert("ログイン成功しました");
        document.getElementById("LoginModal").style.display = "none";
        document.getElementById("UserDataModal").style.display = "block";
        startPeer(); // optional if you want to start after login
    })
    .catch((error) => {
        console.error("ログイン失敗:", error);
        alert("ログインに失敗しました: " + error.message);
    });
}

async function getAllNames() {
  const snapshot = await database.ref("players").once("value");
  const users = await snapshot.val();
  return users ? Object.values(users).map(u => u.Name) : [];
}
async function changeName() {
    const nameInput = document.getElementById("name-change");
    const newName = nameInput.value.trim();
    if (!newName) {
        console.log("❌ 空の名前は使えません");
        document.getElementById("UserDataMessage").innerHTML = "空の名前は使えません";
        return;
    }

    const existingNames = await getAllNames();
    console.log(existingNames)
    if (existingNames.includes(newName)) {
        console.log("❌ この名前は既に使われています");
        document.getElementById("UserDataMessage").innerHTML = "この名前は既に使われています";
        return;
    }

    const user = firebase.auth().currentUser;
    const userRef = database.ref("players/" + user.uid);
    userRef.update({ Name: newName })
    .then(() => {
        console.log("✅ 名前を更新しました");
        document.getElementById("UserDataMessage").innerHTML = "名前を更新しました";
        document.getElementById('UserNameTag').innerHTML = `名前： ${newName}`;
    })
    .catch(error => {
        console.log("❌ エラー：" + error.message);
        document.getElementById("UserDataMessage").innerHTML = "エラー";
    });
}
function fetchRankingRealtime() {
    const playersRef = database.ref('players/');
    playersRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const playersArray = Object.entries(data).map(([userId, playerData]) => ({
                userId,
                name: playerData.Name,
                rate: playerData.Rate
            }));
            playersArray.sort((a, b) => b.rate - a.rate);
            const top10 = playersArray.slice(0, 10);
            showRanking(top10);
        } else {
            console.log("プレイヤーデータが存在しません");
        }
    }, (error) => {
        console.error("データ取得エラー:", error);
    });
}

function showRanking(ranking) {
    const tableBody = document.querySelector("#rankingTable tbody");
    tableBody.innerHTML = '';

    ranking.forEach((player, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${player.name}</td>
          <td>${player.rate}</td>
        `;
        tableBody.appendChild(row);
    });
}




// if first visited, then create each materials count (initialization)
async function initializeMaterials() {
    // indexedDB に "materials" が存在しない場合
    if (!(await getItem("materials"))) {
        // materials 内の各オブジェクトの a キーの値をキーとし、値を 0 にするオブジェクトを作成
        let initialMaterials = {};
        materials.forEach(item => {
            initialMaterials[item.a] = 0;
        });

        // 作成したオブジェクトを indexedDB に保存
        await setItem("materials", initialMaterials);
    }
    if (!(await getItem("sumNs"))) {
        await setItem("sumNs", 0);
    }
}





// ========== indexedDB operations ==========
const DB_NAME = "GameDB";
const STORE_NAME = "GameStore";
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = (event) => reject("DB open error");
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            };
        };
    });
}
async function setItem(key, value) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    return tx.complete;
}
async function getItem(key) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Get error");
    });
}





// ========== prediction models operations ==========
let xs = [];
let ys = [];
let isTraining = false; // 学習中フラグ
let model;
let modelName;
let outputNum;
const countTemplate = Object.fromEntries(Object.values(elementToNumber).map(num => [num, 0]));
// extract model name from url
function extractModelName(url) {
    const match = url.match(/\/([^\/]+)$/);
    return match ? match[1] : null;
}
// load model
async function loadModel(url=null, NameOfModel=null) {
    try {
        if (url == null){//最初にこれを読み込む
            const models = await tf.io.listModels();
            modelName = "standardModel2";
            if (models['indexeddb://standardModel2']) {
                model = await tf.loadLayersModel('indexeddb://standardModel2'); // IndexedDB からロード
                console.log("ローカルの学習済みモデルをロードしました");
            } else {
                model = await tf.loadLayersModel('https://kurorosuke.github.io/AI_models/model3/model.json'); // 外部モデルをロード
                console.log("サーバーからモデルをロードしました");
                await saveModel();
            };
        } else {
            const models = await tf.io.listModels();
            modelName = NameOfModel==null ? extractModelName(url) : NameOfModel;
            if (models[`indexeddb://${modelName}`]) {
                model = await tf.loadLayersModel(`indexeddb://${modelName}`); // IndexedDB からロード
                console.log("ローカルの学習済みモデルをロードしました");
            } else {
                console.log(`${url}/model.json`);
                model = await tf.loadLayersModel(`${url}/model.json`); // 外部モデルをロード
                console.log("サーバーからモデルをロードしました");
            };
            await saveModel();
        };
        addOptions();
        outputNum = model.outputs[0].shape[1];
        if (outputNum!=materials.length) {
            const att = document.getElementById("Attention4");
            att.innerHTML = `モデルは出力${outputNum}個に対応していますが、compoundsは${materials.length}個です`;
            att.style.display="inline";
        } else {
            document.getElementById("Attention4").style.display = "none";
        };
        document.getElementById("Attention").style.display = "none";
    } catch (error) {
        console.error("モデルのロードに失敗しました", error);
        document.getElementById("Attention").style.display = "block";
    };
}
// OneHotEncoding for converting of AI's train data
function oneHotEncode(index, numClasses) {
    const encoded = new Array(numClasses).fill(0);
    encoded[index] = 1;
    return encoded;
}
// count elements in material, convert to 24 dimensions Vector
async function convertToCount(array) {
    // テンプレートのコピーを作成
    let count = { ...countTemplate };
    // 配列内の各元素をカウント
    array.forEach(elem => {
        let num = elementToNumber[elem];
        if (num !== undefined) {
            count[num] += 1;
        };
    });
    // カウントの値を配列として返す（数値順に並ぶ）
    return Object.values(count);
}
// convert to train data shape
async function addTrainingData(playerData, generatedMaterialIndex, who) {
    if (!model) {
        console.log("モデルがロードされていません");
        return;
    };

    // 入力データを取得
    console.log(`playerData: ${playerData}`)
    var inputData = await convertToCount(playerData);
    var total = inputData.reduce(function(sum, element){return sum + element;}, 0);
    inputData.push(who);
    inputData.push(total*2 + Number(!who) + 1);
    console.log(`InputData: ${inputData}`);

    // データをTensorに変換
    const inputTensor = tf.tensor2d([inputData], [1, 26]);
    const outputTensor = tf.tensor2d([oneHotEncode(generatedMaterialIndex, model.outputShape[1])], [1, model.outputShape[1]]);

    // データセットに追加
    xs.push(inputTensor);
    ys.push(outputTensor);
    console.log("データを追加しました: クラス", generatedMaterialIndex);
}
// train AI model
async function trainModel() {
    if (!model || xs.length === 0) {
        console.log("学習データが不足しています");
        return;
    };

    if (isTraining) {return;};
    isTraining = true;

    // 🎯 **モデルのコンパイル（初期学習用）**
    model.compile({
        optimizer: tf.train.adam(0.002),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    if (!model.outputShape || model.outputShape.length < 2) {
        console.error("モデルの outputShape が不正です:", model.outputShape);
        return;
    }

    // 🎯 **データを Tensor に変換**
    const xTrain = tf.concat(xs);
    const yTrain = tf.concat(ys);

    // 🎯 **基本の学習（プレイヤーデータで学習）**
    await model.fit(xTrain, yTrain, {
        epochs: 2,
        batchSize: 32,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}: Loss = ${logs.loss.toFixed(4)}, Accuracy = ${logs.acc.toFixed(4)}`);
            }
        }
    });

    console.log("手札に最も近い物質のデータを追加学習...");

    let adjustedXs = [];
    let adjustedYs = [];

    // 🎯 **エラー防止: numClasses にデフォルト値を設定**
    let numClasses = model.outputShape[1] || (materials ? materials.length : 10);
    
    if (!numClasses || isNaN(numClasses)) {
        console.error("numClasses が不正です:", numClasses);
        isTraining = false;
        return;
    }

    xs.forEach((handVector, index) => {
        // 🎯 **現在の手札に最も近い物質を探す**
        let closestMaterial = findClosestMaterials(p2_hand)[0];
        console.log(closestMaterial);

        if (!closestMaterial) {
            console.warn(`手札 ${index} に対応する近い物質が見つかりません。スキップします。`);
            return;
        };

        let materialIndex = closestMaterial.index;
        console.log(materialIndex);

        console.log(`学習対象: 手札 ${index} → 近い物質: materials[${materialIndex}]`);

        // 🎯 **追加データの作成**
        let adjustedLabels = oneHotEncode(materialIndex, numClasses);
        adjustedYs.push(tf.tensor2d([adjustedLabels], [1, numClasses]));
        adjustedXs.push(handVector); // **元の入力データを再利用**
    });

    if (adjustedXs.length === 0 || adjustedYs.length === 0) {
        console.warn("追加学習用のデータが不足しているため、スキップします。");
        isTraining = false;
        return;
    };

    // 🎯 **追加学習用のデータを Tensor に変換**
    const xTrainSim = tf.concat(adjustedXs);
    const yTrainSim = tf.concat(adjustedYs);

    // 🎯 **モデルのコンパイル（追加学習用）**
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    // 🎯 **最も近い物質のデータで追加学習**
    await model.fit(xTrainSim, yTrainSim, {
        epochs: 1,
        batchSize: 32,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch + 1}: Loss = ${logs.loss.toFixed(4)}, Accuracy = ${logs.acc.toFixed(4)}`);
            }
        }
    });

    console.log("モデルの追加学習が完了しました");

    // 🎯 **メモリ解放**
    xTrain.dispose();
    yTrain.dispose();
    xTrainSim.dispose();
    yTrainSim.dispose();
    xs = [];
    ys = [];
    isTraining = false;

    await saveModel();
}
// predict users create material by AI
async function runModel(who,madeMaterialNum) {
    if (!model) {
        console.log("モデルがロードされていません");
        return;
    };

    // 入力データ
    var inputData = await convertToCount(dropped_cards_p2);
    var total = inputData.reduce(function(sum, element){return sum + element;}, 0);
    inputData.push(who);
    inputData.push(total*2 + Number(!who) +1);

    inputData = tf.tensor2d([inputData], [1, 26]);

    // 推論実行＆出力
    const output = model.predict(inputData);
    let outputData = await output.data();

    // これまでの統計データを参照
    let recordCreatedMaterials = getUsedMaterials();
    let pseudoProbability = calculatePseudoProbabilities(recordCreatedMaterials);

    // 2つの確率分布から最終的な確率分布を計算
    let weightedResults = await calculateWeightedProbabilities(pseudoProbability, outputData);

    let sortedResults = Object.entries(weightedResults).sort((a, b) => b[1] - a[1]);
    let ShowMaterials = sortedResults.slice(0,3); // 最初の3つの要素を取得

    // 作成した material の順位を取得
    let madeMaterialRank = sortedResults.findIndex(([key]) => key == madeMaterialNum) + 1; // 1位から数える
    ShowMaterials.push([madeMaterialNum , weightedResults[madeMaterialNum]]);

    // HTMLテーブル更新
    let tableBody = document.getElementById("predictTable").getElementsByTagName("tbody")[0];
    tableBody.innerHTML = ""; // テーブルをクリア

    let ranking = ["1位","2位","3位", `${madeMaterialRank}位`];

    ShowMaterials.forEach(([key, value], index) => {
        if (materials[key] != null) {
            let row = tableBody.insertRow();
            let cell0 = row.insertCell(0);
            let cell1 = row.insertCell(1);
            let cell2 = row.insertCell(2);
            cell0.innerHTML = ranking[index];
            cell1.innerHTML = materials[key].a;  // 物質名
            cell2.innerHTML = (value * 100).toFixed(2) + "%";  // 確率（%表示）
        };
    });

    document.getElementById("predictResultContainer").style.display = "inline";

    // Math.max を使って最大値を取得
    var confidence = Math.max(...Object.values(weightedResults));

    // 最大値に対応するキーを検索
    var predictedClass = Object.keys(weightedResults).find(key => weightedResults[key] === confidence);
    console.log(`予測した化合物のキー：${predictedClass}`);

    try {while (await CanCreateMaterial(materials[predictedClass])) {
        // weightedResults から現在の predictedClass を削除
        delete weightedResults[predictedClass];
    
        if (Object.keys(weightedResults).length === 0) {
            console.log("作成できる候補がありません");
            return;
        };
    
        // Math.max を使って最大値を取得
        var confidence = Math.max(...Object.values(weightedResults));
    
        // 最大値に対応するキーを検索（数値型に変換）
        var predictedClass = Object.keys(weightedResults).find(key => weightedResults[key] === confidence);
    };
    } catch {
        console.log(materials[predictedClass])
        if (materials[predictedClass] == null) {
            console.log("モデルと化合物のバージョンが異なります")
        };
    };
    if (predictedClass<=materials.length) {        
        // 結果を表示
        console.log(`推論結果: クラス ${predictedClass}, 信頼度: ${confidence}`);
        document.getElementById("predictResult").innerHTML = `予測結果：${materials[predictedClass].a}・信頼度：${confidence}`;
    };
}
// save trained AI model on indexedDB
async function saveModel() {
    if (!model) {
        console.log("モデルがロードされていません");
        return;
    };
    try {
        console.log(`indexeddb://${modelName}`)
        await model.save(`indexeddb://${modelName}`); // IndexedDB に保存
        console.log("学習済みモデルを IndexedDB に保存しました");
    } catch (error) {
        console.error("モデルの保存に失敗しました", error);
    };
}
// warm up model (by dummy data predict)
async function warmUpModel() {
    const dummyInput = tf.tensor2d([Array(26).fill(0)], [1, 26]);
    model.predict(dummyInput); // await しなくてOK、これだけでOK
    console.log("✅ モデルのウォームアップ完了");
}





// ========== statistics of created materials ==========
// get used materials from before battle results
async function getUsedMaterials() {
    // indexedDB から "materials" のデータを取得
    let storedMaterials = await getItem("materials");

    // データが null, 空文字, 空オブジェクトの場合は処理しない
    if (!storedMaterials || storedMaterials === "{}") {
        console.log("No valid materials data found.");
        return {};
    }
    // 1回以上作成された（値が1以上の）物質のみを抽出
    let usedMaterials = Object.fromEntries(
        Object.entries(storedMaterials).filter(([key, value]) => value > 0)
    );

    return usedMaterials;
}
// calculate each material probabilities to create by user from before battle results
function calculatePseudoProbabilities(materials) {
    let total = Object.values(materials).reduce((sum, value) => sum + value, 0);
    if (total === 0) return {}; // すべて 0 なら確率なし

    let probabilities = {};
    for (let key in materials) {
        probabilities[key] = materials[key] / total;
    };

    return probabilities;
}
// for ensemble model of AI and statistics (runModel() and calculatePseudoProbabilities())
async function calculateWeightedProbabilities(probabilities, outputData) {
    let weightedProbabilities = {};

    // 共通するキーがあれば掛け算し * 100、なければ outputData*0.1 にする
    for (let key in outputData) {
        if (probabilities.hasOwnProperty(key)) {
            sumNs = await getItem("sumNs");
            weightedProbabilities[key] = (probabilities[key]*sumNs / (sumNs + 10) + outputData[key]) /2; //\frac{x}{x+c} という関数で0→0、∞→1となる関数。cで速さを調整可能。
        } else {
            weightedProbabilities[key] = outputData[key];
        };
    };

    return weightedProbabilities;
}
// increment materials count of created material
async function incrementMaterialCount(material) {
    // indexedDB から "materials" キーのデータを取得
    let materialsData = await getItem("materials");

    // 指定された material の値を1増やす（存在しない場合は初期値1）
    materialsData[material] = (materials[material] || 0) + 1;

    // 更新したオブジェクトをJSONに変換してindexedDBに保存
    await setItem("materials", materialsData);
    var sumNs = await getItem("sumNs");
    await setItem("sumNs", sumNs+1);
}





// ========== p1's actions ==========
// view p1_hand (back of card)
async function view_p1_hand() {
    const area = document.getElementById('p1_hand');
    p1_hand.forEach((elem, index) => {
        const blob = imageCache[0];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = "相手の手札";
        image.style.padding = "5px";
        image.style.border = "1px solid #000";
        image.classList.add("selected");
        image.classList.toggle("selected");
        area.appendChild(image);
    })
}
// p1 action. this function decide actions(create, exchange,...)
async function p1_action() {
    if (turn !== "p1" || p1_is_acting) {
        return;  // すでに行動中なら何もしない
    };
    p1_is_acting = true;  // 行動開始

    // フィルタリング
    const highPointMaterials = materials.filter(material => material.c > threshold);
    
    // 最適な物質を選択
    const sortedMaterials = highPointMaterials.sort((a, b) => {
        let aMatchCount = Object.keys(a.d).reduce((count, elem) => count + Math.min(p1_hand.filter(e => e === elem).length, a.d[elem]), 0);
        let bMatchCount = Object.keys(b.d).reduce((count, elem) => count + Math.min(p1_hand.filter(e => e === elem).length, b.d[elem]), 0);
        return bMatchCount - aMatchCount || b.c - a.c;
    });

    const targetMaterial = sortedMaterials[0];

    if (!targetMaterial) {
        p1_exchange(Math.floor(Math.random() * p1_hand.length));
    } else {
        let canMake = true;
        for (const element in targetMaterial.d) {
            if (!p1_hand.includes(element) || p1_hand.filter(e => e === element).length < targetMaterial.d[element]) {
                canMake = false;
                break;
            };
        };
        if (canMake && targetMaterial.c > threshold) {
            time = "make";
            await done("p1");
        } else {
            let unnecessaryCards = p1_hand.filter(e => {
                return !(e in targetMaterial.d) || p1_hand.filter(card => card === e).length > targetMaterial.d[e];
            });

            if (unnecessaryCards.length > 0) {
                let cardToExchange = unnecessaryCards[Math.floor(Math.random() * unnecessaryCards.length)];
                p1_exchange(p1_hand.indexOf(cardToExchange));
            } else {
                time = "make"
                done("p1");
            };
        };
    };
    
    turn = "p2";
    p1_is_acting = false;
}
// p1 exchange card by automation
async function p1_exchange(targetElem) {
    console.log("this")
    // Select a random card index from p1_hand// TODO: from AI.js
    dropped_cards_p1.push(p1_hand[targetElem]);
    var exchange_element = p1_hand[targetElem];
    // Ensure the target card exists and is valid
    if (!p1_hand[targetElem]) {
        console.error("Invalid target element in p1_hand.");
        return;
    };
    // Create a new image for the dropped card area
    
    const blob = imageCache[elementToNumber[p1_hand[targetElem]]];
    const newImg = new Image();
    newImg.src = URL.createObjectURL(blob);
    newImg.style.border = "1px solid #000";
    document.getElementById("dropped_area_p1").appendChild(newImg);
    // Update the player's hand with a new element
    const img = document.querySelectorAll("#p1_hand img")[targetElem];
    if (!img) {
        console.error("Image element not found in p1_hand.");
        return;
    }
    // Select a new random element and replace the target card
    const newElem = drawCard();
    p1_hand[targetElem] = newElem;
    // Update the image element's appearance
    img.alt = newElem;
    img.style.border = "1px solid #000";
    // Remove and reapply the 'selected' class to reset the state
    img.classList.remove("selected");
    img.classList.add("selected");
    img.classList.toggle("selected");
    // Switch the turn to "p2"
    turn = "p2";
    checkRon(exchange_element);
}
// make p1's material when done()
async function p1_make(predictedMaterialP2) {
    const makeable_material = await search_materials(arrayToObj(p1_hand));

    // 作れる物質がない場合は "なし" を返す
    if (!makeable_material || makeable_material.length === 0) {
        return [{
            "a": "なし",
            "b": "なし",
            "c": 0,
            "d": {},
            "e": []
        }];
    };

    // ポイントが高い順にソート
    makeable_material.sort((a, b) => b.c - a.c);
    p1_selected_card = dictToArray(makeable_material[0].d);

    return makeable_material;
}
// select cards of p1 has to select element of material
function selectCardsForMaterial(hand, materialDict) {
    const selected = [];
    let handCopy = [...hand]; // 元の手札を壊さないようにコピー
    handCopy[handCopy.indexOf(p1_selected_card[0])] = null;
    console.log(handCopy);

    for (const [element, count] of Object.entries(materialDict)) {
        let needed = count;
        for (let i = 0; i < handCopy.length && needed > 0; i++) {
            if (handCopy[i] === element) {
                selected.push(element);
                handCopy[i] = null; // 同じカードを何度も使わないようにマーク
                needed--;
            };
        };
    };
    return selected;
}
// showdown p1_hand (front of card)
async function showDown() {
    console.log(p1_selected_card);
    const area = document.getElementById('p1_hand');
    area.innerHTML = "";

    let selectedCopy = [...p1_selected_card]; // 使用済みチェック用のコピー

    p1_hand.forEach((elem, index) => {
        const number = elementToNumber[elem];
        const blob = imageCache[number];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = elem;
        image.style.padding = "5px";
        image.style.border = "1px solid #000";

        // 同じ種類のカードを何枚も選べるように、1枚ずつ処理
        const selectedIndex = selectedCopy.indexOf(elem);
        if (selectedIndex !== -1) {
            image.classList.add("selectedP1");
            selectedCopy.splice(selectedIndex, 1); // 使用済みにする
        };

        area.appendChild(image);
    });
}





// ========== p2's actions ==========
// view p2_hand and card operations processing
// TODO: CPU対戦とP2P対戦のときの条件分岐をもうちょっと考える
async function view_p2_hand() {
    const area = document.getElementById('p2_hand');
    p2_hand.forEach((elem, index) => {
        const blob = imageCache[elementToNumber[elem]];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = elem;
        image.style.padding = "5px";
        image.style.border = "1px solid #000";
        image.classList.add("selected");
        image.classList.toggle("selected");
        image.addEventListener("click", function() {
            const button = document.getElementById("ron_button");
            button.style.display = "none";
            if (time == "make") {
                this.classList.toggle("selected");
                if (this.classList.contains("selected")){
                    p2_selected_card.push(this.alt);
                } else {
                    p2_selected_card.splice(p2_selected_card.indexOf(this.alt),1);
                };
            };
            if (turn == MineTurn && time == "game") {
                dropped_cards_p2.push(this.alt);
                const blob = imageCache[elementToNumber[this.alt]];
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                img.alt = this.alt;
                img.style.border = "1px solid #000";
                document.getElementById("dropped_area_p2").appendChild(img);
                this.classList.remove("selected");
                this.classList.add("selected");
                this.classList.toggle("selected");
                let newElem = drawCard();
                const newBlob = imageCache[elementToNumber[newElem]];
                this.src = URL.createObjectURL(newBlob);
                this.alt = newElem;
                this.style.padding = "5px";
                this.style.border = "1px solid #000";
                p2_hand[index] = newElem;
                if (GameType == "CPU") {
                    turn = "p1";
                    if (document.getElementById("hintContainer").style.display != 'none') {
                        document.getElementById("hint_button").click();
                    };
                    const dropCard = img.alt;
                    setTimeout(() => {checkRon(dropCard)},500);
                } else {
                    turn = (turn == "p2") ? "p1" : "p2";
                    changeTurn(turn);
                    shareAction(action="exchange",otherData=img.alt);
                };
            };
        })
        area.appendChild(image);
    })
}
// make p2's material when done()
async function p2_make() {
    // ボタンの表示を変更
    time = "make";

    document.getElementById("generate_button").style.display = "none";
    document.getElementById("hintContainer").style.display = "none";
    document.getElementById("hint_button").style.display = "none";
    const button = document.getElementById("done_button");
    button.style.display = "inline";

    // 以前のイベントリスナーを削除
    button.replaceWith(button.cloneNode(true));
    const newButton = document.getElementById("done_button");

    // ボタンクリックを待機
    return new Promise((resolve) => {
        newButton.addEventListener("click", async function () {
            document.getElementById("done_button").style.display = "none";
            p2_make_material = await search(arrayToObj(p2_selected_card));
            resolve(p2_make_material);
            console.log("this is p2_make()");
            if (GameType=="P2P") {console.log("this is p2_make() -2");finishSelect();}
        });
    });
}
// create p2.
document.getElementById("generate_button").addEventListener("click", async function () {
    if (turn == MineTurn) {
        document.getElementById("hintContainer").style.display = "none"; // 非表示
        document.getElementById("hint_button").style.display = "none"; // 非表示
        time = "make";
        document.getElementById("ron_button").style.display = "none";
        if (GameType=="CPU") {
            done("p2");
        } else {
            shareAction(action="generate",otherData=MineTurn);
            await p2_make();
        }
    };
})




// ========== check Ron action of p1, p2 ==========
async function checkRon(droppedCard) {
    // P2のロン判定
    if (GameType=="CPU") {
        if (turn=="p2"){
            const possibleMaterialsP2 = await search_materials(arrayToObj([...p2_hand, droppedCard]));
            const validMaterialsP2 = possibleMaterialsP2.filter(material => material.d[droppedCard]);
            if (validMaterialsP2.length > 0) {
                const ronButton = document.getElementById("ron_button");
                ronButton.style.display = "inline";
                ronButton.replaceWith(ronButton.cloneNode(true));
                const newRonButton = document.getElementById("ron_button");

                newRonButton.addEventListener("click", function () {
                    newRonButton.style.display = "none";
                    const dropped = document.querySelectorAll("#dropped_area_p1 img");
                    const selectCard = dropped[dropped.length - 1];
                    selectCard.classList.add("selected");
                    p2_selected_card = [droppedCard];
                    time = "make";
                    done("p2", p2_ron = true);
                });
            };
        } else if (turn=="p1"){
            console.log("P1 ron check");
            // P1のロン判定（捨てられたカードを含める）
            const possibleMaterialsP1 = await search_materials(arrayToObj([...p1_hand, droppedCard]));
            let validMaterialsP1 = [];
            if (possibleMaterialsP1.length > 0) {
                // 最も高いポイントの物質を選ぶ
                const maxMaterial = possibleMaterialsP1.reduce((max, m) => m.c > max.c ? m : max);
                console.log(maxMaterial);

                // 条件に合えば validMaterialsP1 に追加
                if (maxMaterial.c >= threshold*1.2 && (droppedCard in maxMaterial.d)) {
                    validMaterialsP1 = [maxMaterial];
                };
            };
            if (validMaterialsP1.length > 0) {
                console.log("P1 ron button");
                // `time` を "make" に変更
                time = "make";

                const DroppedCards = document.getElementById("dropped_area_p2").children;
                const lastDiscard = DroppedCards[DroppedCards.length - 1];
                lastDiscard.classList.add("selectedP1");

                // P1のロン処理を実行
                done("p1", validMaterialsP1, droppedCard, p1_ron=true);
            } else {
                p1_action();
            };
        };
    } else {
        // ① P2のロン判定
        console.log("this")
        const possibleMaterialsP2 = await search_materials(arrayToObj([...p2_hand, droppedCard]));

        // droppedCard を含む物質のみを抽出
        const validMaterialsP2 = possibleMaterialsP2.filter(material => material.d[droppedCard]);

        if (validMaterialsP2.length > 0) {
            const ronButton = document.getElementById("ron_button");
            ronButton.style.display = "inline";
            ronButton.replaceWith(ronButton.cloneNode(true));
            const newRonButton = document.getElementById("ron_button");

            newRonButton.addEventListener("click", function () {
                newRonButton.style.display = "none";
                p2_selected_card = [droppedCard];
                p2_make();
                
                // 捨て牌一覧の最後の要素を取得し、赤枠を付ける
                const DroppedCards = document.getElementById("dropped_area_p1").children
                const lastDiscard = DroppedCards[DroppedCards.length - 1]
                lastDiscard.style.border = "2px solid red";
                shareAction(action="generate", otherData=MineTurn);
            });
        }
    }
}





// ========== done processes ==========
let base_point_bonus = false;
// get dora
async function get_dora() {
    return element[Math.round(Math.random()*23)];
}
// done process. finally, next game button or finish game button.
async function done(who, ronMaterial, droppedCard, p1_ron = false, p2_ron = false) {
    console.log(ronMaterial);
    document.getElementById("ron_button").style.display = "none";
    document.getElementById("hint_button").style.display = "none";
    document.getElementById("hintContainer").style.display = "none";

    await p2_make();
    let predictedMaterialP2 = await runModel(who=="p1" ? 0:1, p2_make_material.f);
    const p1_make_material = p1_ron ? ronMaterial : await p1_make(predictedMaterialP2);
    console.log(p1_make_material);
    p1_selected_card.push(...dictToArray(p1_make_material[0].d));
    p1_selected_card.splice(p1_selected_card.indexOf(droppedCard),1);

    let dora = await get_dora();
    console.log(`ドラ: ${dora}`);
    
    let thisGame_p2_point = p2_make_material.c;
    let thisGame_p1_point = p1_make_material[0].c;

    // 有利な生成物の場合のボーナス
    if (Boolean(p2_make_material.e.includes(p1_make_material[0].b))) {
        thisGame_p2_point *= (1.5 + Math.random() / 2);
    } else if (Boolean(p1_make_material[0].e.includes(p2_make_material.b))) {
        thisGame_p1_point *= (1.5 + Math.random() / 2);
    };

    // 役の中にドラが含まれる場合のボーナス
    if (Boolean(Object.keys(p2_make_material.d).includes(dora))) {
        thisGame_p2_point *= 1.5;
    } else if (Boolean(Object.keys(p1_make_material[0].d).includes(dora))) {
        thisGame_p1_point *= 1.5;
    };

    // **ロン時のボーナス**
    if (p1_ron || p2_ron) {
        who == "p2" ? thisGame_p2_point /= 1.2 : thisGame_p1_point /= 1.2;
    };

    who == "p2" ? thisGame_p1_point /= 1.5 : thisGame_p2_point /= 1.5;

    // 小数点以下を四捨五入
    thisGame_p2_point = Math.round(thisGame_p2_point);
    thisGame_p1_point = Math.round(thisGame_p1_point);
    if (base_point_bonus) {thisGame_p2_point += thisGame_p2_point;}; // 開発モード

    // 得点を更新
    p1_point += await thisGame_p1_point;
    p2_point += await thisGame_p2_point;

    // 画面に反映
    document.getElementById("p2_point").innerHTML += `+${thisGame_p2_point}`;
    document.getElementById("p1_point").innerHTML += `+${thisGame_p1_point}`;
    document.getElementById("p2_explain").innerHTML = `生成物質：${p2_make_material.a}, 組成式：${p2_make_material.b}`;
    document.getElementById("p1_explain").innerHTML = `生成物質：${p1_make_material[0].a}, 組成式：${p1_make_material[0].b}`;

    // クエスト達成をチェック (CPU戦かつプレイヤーの行動時)
    if (who === "p2") {
        await checkQuest(p2_make_material, p2_point);
    }

    //モデルを学習
    if (IsTraining) {
        let generatedMaterialIndex = p2_make_material.f;
        await addTrainingData(p2_hand, generatedMaterialIndex, who=="p1" ? 0:1);
        await trainModel();

        await incrementMaterialCount(p2_make_material.a);
    };

    // 勝者判定
    const winner = await win_check();
    const ExplainArea = document.getElementById("p1_explain");
    if (winner=="p1") {
        ExplainArea.innerHTML = "YOU LOSE";
        ExplainArea.style.color = "blue";
        ExplainArea.style.fontSize = "5vh";
    } else if (winner=="p2") {
        ExplainArea.innerHTML = "YOU WIN!";
        ExplainArea.style.color = "red";
        ExplainArea.style.fontSize = "5vh";
    };

    document.getElementById("done_button").style.display = "none";
    const button = document.getElementById("nextButton");
    button.style.display = "inline";
    showDown();

    if (!winner) {
        console.log("次のゲーム");
        numTurn += 1;
        button.textContent = "次のゲーム";
        button.addEventListener("click", function () {
            document.getElementById("predictResultContainer").style.display = "none";
            resetGame();
            button.style.display = "none"
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
    } else {
        console.log("ゲーム終了");
        button.textContent = "ラウンド終了";
        button.addEventListener("click", function () {
            p1_point = 0;
            p2_point = 0;
            numTurn = 1;
            resetGame();
            returnToStartScreen();
            button.style.display = "none";
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
    };
}
// win check (p1 win => return "p1", p2 win => return "p2". And p1 and p2 don't win => return null)
async function win_check() {
    if (Math.abs(p1_point - p2_point) >= WIN_POINT) {
        return p1_point>p2_point ? "p1": "p2";
    } else {
        if (numTurn >= WIN_TURN) {
            return p1_point>p2_point ? "p1": "p2"; 
        } else {
            return null;
        }
    }
}

// useful functions
function arrayToObj(array) {
    let result = {};
    array.forEach(item => {
        if (result[item]) {
            result[item]++;
        } else {
            result[item] = 1;
        };
    });
    return result;
}
function dictToArray(dict) {
    const result = [];
    for (const [key, value] of Object.entries(dict)) {
        for (let i = 0; i < value; i++) {
            result.push(key);
        };
    };
    return result;
}
// for deck shuffle
function shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    };

    return array;
}
// if no drawable card, then done() in drawCard()
async function no_draw_card() {
    await p2_make();
    
    // 待機用のPromise
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if (!p1_finish_select && !p2_finish_select) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });

    //console.log("next process");
    if (MineTurn === "p2") {
        console.log(p2_make_material);
        finish_done_select(p1_make_material, p2_make_material, "no-draw", isRon=false);
    }
}
// get next card (if no card in deck, then done()) from this function.
function drawCard() {
    if (deck.length > 0) {
        return deck.pop()
    } else {
        if (time = "make", GameType=="CPU"){
            done("no-draw")
        } else {
            shareAction("generate");
            no_draw_card();
        }
    }
}
// count creatable materials for CanCreateMaterial()
function removeCards(tmpDeck, allCards) {
    // allCards の出現回数をカウント
    const countMap = new Map();
    for (const card of allCards) {
        countMap.set(card, (countMap.get(card) || 0) + 1);
    };

    // tmpDeck から allCards に含まれるカードを個数分だけ削除
    return tmpDeck.filter(card => {
        if (countMap.has(card) && countMap.get(card) > 0) {
            countMap.set(card, countMap.get(card) - 1); // 1つ減らす
            return false; // 除外
        }
        return true; // 残す
    });
}
// return "material is create?"
async function CanCreateMaterial(material) {
    if (!material) {
        console.error("❌ Error: Material is undefined!");
        return true;  // 作れないと判定
    }
    
    // 必要な元素リスト
    const requiredElements = material.d;

    // 使用可能な元素のカウント
    let availableElements = {};

    // すべてのカードを統合
    let allCards = [...p1_hand, ...dropped_cards_p1, ...dropped_cards_p2];
    let tmpDeck = [...elements, ...elements];
    tmpDeck = await removeCards(tmpDeck, allCards);

    // 各カードの元素をカウント
    tmpDeck.forEach(card => {
        availableElements[card] = (availableElements[card] || 0) + 1;
    });

    // `c == 0` の場合は作れないと判断
    if (material.c == 0) {
        console.log("Material has c == 0, returning true.");
        return true;
    };

    // 必要な元素がすべて揃っているかチェック
    for (const element in requiredElements) {
        if (!availableElements[element] || availableElements[element] < requiredElements[element]) {
            console.log(`Missing element: ${element}, returning true.`);
            return true; // 必要な元素が不足している場合
        };
    };

    return false; // すべての必要な元素が揃っている場合
}
// search creatable materials for p1
async function search_materials(components) {
    return materials.filter(material => {
        for (const element in material.d) {
            if (!components[element] || material.d[element] > components[element]) {
                return false;
            };
        };
        return true;
    });
}
// return just a material
async function search(components) {
    return materials.find(material => {
        for (const element in components) {
            if (!material.d[element] || material.d[element] !== components[element]) {
                return false;
            };
        };
        for (const element in material.d) {
            if (!components[element]) {
                return false;
            };
        };
        return true;
    }) || materials[0];
}





// ========== set settings from Modal ==========
let selectingModel;
let IsTraining; // 「学習するか」フラグ
let compoundsURL;
// save Modal settings
async function saveWinSettings() {
    // 入力取得
    const winPointInput = parseInt(document.getElementById("winPointInput").value, 10);
    const winTurnInput = parseInt(document.getElementById("winTurnInput").value, 10);
    const thresholdInput = parseFloat(document.getElementById("threshold").value);
    const isTraining = document.getElementById("IsTraining").value;
    const compoundsSelection = document.getElementById("compoundsSelection").value;
    compoundsURL = compoundsSelection === "url" ? document.getElementById("compoundsURL").value : `https://kurorosuke.github.io/compounds/obf_${compoundsSelection}_min.json`;

    if (isNaN(winPointInput)) {
        alert("コールドスコア は 1 以上 999 以下の数値を入力してください。");
        return;
    } else if (winPointInput < 1) {
        alert("コールドスコア は 1 以上の数値を入力してください。");
        return;
    } else if (winPointInput > 999) {
        if (winPointInput == 20100524) {
            alert("開発モード！ポイント２倍！")
            base_point_bonus = true;
            return;
        };
        alert("コールドスコア の最大値は 999 です。");
        return;
    };

    if (isNaN(winTurnInput) || winTurnInput < 1) {
        alert("ターン数 は 1 以上の数値を入力してください。");
        return;
    };

    // threshold の検証
    if (isNaN(thresholdInput) || thresholdInput < 0) {
        alert("相手しきい値 は 0以上の値にしてください。");
        return;
    };

    // グローバル変数に反映
    threshold = thresholdInput;
    WIN_POINT = winPointInput;
    WIN_TURN = winTurnInput;
    IsTraining = isTraining;
    materials = await loadMaterials(compoundsURL);

}
// show input tag of compound URL
function showInputTag() {
    if (document.getElementById("compoundsSelection").value == "url"){
        document.getElementById("compoundsUrlRow").style.display = "flex";
    } else {
        document.getElementById("compoundsUrlRow").style.display = "none";
    };
}





// =====  detail of model Modal settings =====
let removeTarget = [];
// get model date (final uses)
async function getModelsDate(modelName) {
    try {
        const models = await tf.io.listModels();
        const modelInfo = models[`indexeddb://${modelName}`];
        if (!modelInfo) {
            return "N/A";
        };
        return new Date(modelInfo.dateSaved).toLocaleString()
    } catch (error) {
        console.error(`Error fetching date for model ${modelName}:`, error);
        return "N/A";
    };
}
// get model Name
async function getModelNames() {
    try {
        const models = await tf.io.listModels();
        const modelNames = Object.keys(models).map(key => key.replace('indexeddb://', ''));
        return modelNames;
    } catch (error) {
        console.error("モデル名の取得に失敗しました", error);
        return [];
    };
}
// show Model setting when click setting button
function showModelDetail() {
    addOptions();
    document.getElementById("modelModals").style.display = "inline";
    document.getElementById("buttonModal").style.display = "inline";
    document.getElementById("overlay").style.display = "inline";
}
// show model Modal
async function addLoadingButton() {
    const container = document.getElementById("modelModals");

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "modelFileInput";
    fileInput.style.display = "none";
    fileInput.accept =  ".zip";

    const label = document.createElement("label");
    label.setAttribute("for", "modelFileInput");
    label.innerText = "モデルを読み込む";
    label.style.display = "inline-block";
    label.style.padding = "10px 0px";
    label.style.backgroundColor = "#eee";
    label.style.border = "1px solid #ccc";
    label.style.borderRadius = "6px";
    label.style.cursor = "pointer";
    label.style.textAlign = "center";
    label.style.margin = "0 0 20px 0";
    label.id = "FileLoadLabel";

    fileInput.addEventListener("change", async (event) => {
        const files = Array.from(event.target.files);
        let model;
        let modelName;
        try {
            const zipFile = files[0];
            if (!zipFile || !zipFile.name.endsWith(".zip")) {
                alert("ZIPファイルを選択してください");
                return;
            }
            const zip = await JSZip.loadAsync(zipFile);
            // ZIP内のファイル名を取得
            const fileNames = Object.keys(zip.files);
            // model.jsonファイルを特定
            const modelJsonName = fileNames.find(name => name.endsWith('.json'));
            if (!modelJsonName) {
                throw new Error('model.json ファイルが見つかりません');
            }
            // その他のファイル（.binなど）を取得
            const weightFileNames = fileNames.filter(name => name !== modelJsonName);
            // model.jsonの内容を取得
            const modelJson = await zip.files[modelJsonName].async('string');
            // 重みファイルの内容を取得
            const weightFiles = await Promise.all(
                weightFileNames.map(async name => {
                    const content = await zip.files[name].async('arraybuffer');
                    return new File([content], name, {type: 'application/octet-stream'});
                })
            );
            // model.jsonをFileオブジェクトに変換
            const modelJsonFile = new File([modelJson], modelJsonName, {
                type: 'application/json',
            });

            // モデルを読み込む
            const check = await tf.io.browserFiles([modelJsonFile, ...weightFiles]);
            console.log(check)
            model = await tf.loadLayersModel(check);
            console.log(model);

            //モデルの名前を決める
            let models = await getModelNames();
            do {tmpModelName = prompt("使われていないモデルの名前を入力してください（半角英数のみ）")} while(models.includes(tmpModelName));
            modelName = tmpModelName;

            // 保存（IndexedDB に）
            await model.save(`indexeddb://${modelName}`);
            // モデル一覧を更新
            await addOptions();
            // 選択状態にする
            selectModelOnSetting(modelName);
        } catch (err) {
            console.error("モデルの読み込みに失敗しました:", err);
            alert("モデルの読み込みに失敗しました");
        }
        // 選択済みファイルの選択解除
        fileInput.value = "";
    });
    container.appendChild(fileInput);
    container.appendChild(label);
}
// show input Tag
function addInputModelDiv() {
    const NewModelOption = document.createElement("div");
    NewModelOption.id = "_inputDiv";
    let inputTag = document.createElement("input");
    inputTag.id = "inputTag";
    inputTag.placeholder = "新しいモデルのURLを入力";
    let inputButton = document.createElement("button");
    inputButton.innerHTML = "追加";
    inputButton.id = "inputButton";
    inputButton.onclick = function() {
        let inputTagDOM = document.getElementById("inputTag");
        console.log(inputTagDOM.value)
        getModelNames().then(models => {
            do {
                userInput = prompt("名前を入力してください:");
                if (userInput==null) {userInput = extractModelName(url)};
            } while (models.includes(userInput));
            loadModel(inputTagDOM.value,userInput);
            inputTagDOM.value = "";
        });
    };
    NewModelOption.appendChild(inputTag);
    NewModelOption.appendChild(inputButton);
    document.getElementById("modelModals").appendChild(NewModelOption);
}
// add model setting area's option on Modal
async function addOptions() {
    let models = await getModelNames();
    const Selection = document.getElementById("modelModals");
    Selection.innerHTML = "";
    addInputModelDiv();
    addLoadingButton();
    models.forEach(elem => {
        const newOption = document.createElement("div");
        newOption.className = "modelModal";
        newOption.id = elem;
        newOption.text  = elem;
        const title = document.createElement("h3");
        title.textContent = elem;
        newOption.appendChild(title);

        const date = document.createElement("p");
        getModelsDate(elem).then(data => {
            date.textContent = data || "未取得";
        });

        let selectButton = document.createElement("button");
        selectButton.textContent = "選択";
        selectButton.id = newOption.id;
        selectButton.onclick = function() { selectModelOnSetting(this.id); };
        // 削除ボタン
        let deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";
        deleteButton.id = newOption.id;
        deleteButton.onclick = function() { removeModelOnSetting(this.id); };
        // 保存ボタン
        let saveButton = document.createElement("button");
        saveButton.textContent = "保存";
        saveButton.id = newOption.id;
        saveButton.onclick = function() {downloadModel(this.id); };

        // 要素をモーダルに追加
        newOption.appendChild(title);
        newOption.appendChild(date);
        newOption.appendChild(selectButton);
        newOption.appendChild(saveButton);
        newOption.appendChild(deleteButton);
        if (newOption.id == modelName) {newOption.style.background = "pink"; };

        Selection.appendChild(newOption);
    });
}
// select Model by click, change color
function selectModelOnSetting(selectModelName) {
    selectingModel = selectModelName;
    const modelDivs = document.querySelectorAll("#modelModals div");
    modelDivs.forEach(elem => {
        elem.style.background = "white";
    });
    document.getElementById(selectModelName).style.background = "pink";
}
// remove Model by setting
function removeModelOnSetting(selectModelName) {
    console.log(selectModelName);
    removeTarget.push(selectModelName);
    document.getElementById(selectModelName).remove();
}
// download Model from indexedDB
async function downloadModel(NameOfModel) {
    try {
        console.log(NameOfModel);

        // modelを読み込んで保存
        const model = await tf.loadLayersModel(`indexeddb://${NameOfModel}`);
        await model.save(tf.io.withSaveHandler(async (data) => {
            const zip = new JSZip();
            // 重みバイナリファイル名を固定
            const weightFileName = `${NameOfModel}.weights.bin`;
            // 完全（weight.binファイルのパスを含む）な model.json を構築
            const fullModelJson = {
                modelTopology: data.modelTopology,
                weightsManifest: [{
                    paths: [weightFileName],
                    weights: data.weightSpecs,
                }]
            };
            //JSONファイルとweight.binファイルをzip化
            zip.file(`${NameOfModel}.json`, JSON.stringify(fullModelJson));
            zip.file(weightFileName, new Blob([data.weightData]));
            // blob形式に変換
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            // aタグクリック
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${NameOfModel}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`モデル ${NameOfModel} を 保存しました`);
        }));
    } catch (error) {
        console.error(`モデル ${NameOfModel} の保存に失敗しました`, error);
    }
}
// apply Model setting, and close
function applyModalSetting() {
    //document.getElementById("winSettingsModal").style.display = "none";
    removeTarget.forEach(elem => {
        tf.io.removeModel(`indexeddb://${elem}`)
    });
    console.log(`this:${selectingModel}`);
    if (selectingModel) {
        if (!removeTarget.includes(selectingModel)) {
            loadModel("notNull",selectingModel);
        } else {
            loadModel("https://kurorosuke.github.io/AI_models/model3");
        };
    }
    closeModelModal();
}
// close Model Modal
function closeModelModal() {
    removeTarget = [];
    document.getElementById("modelModals").style.display = "none";
    document.getElementById("buttonModal").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}





// ========== game explain Modal ==========
// show explain
function showRules() {
    //closePeerModal();
    //closeWinSettings();
    document.getElementById("rulesModal").style.display = "block";
}
// close explain
function closeRules() {
    document.getElementById("rulesModal").style.display = "none";
}
// Add click event listener to the close button
document.getElementById("closeRulesButton").addEventListener("click", closeRules);
// モーダル外をクリック / タップした場合に閉じる（iPad対応）
function handleOutsideClick(event) {
    const modal = document.getElementById("rulesModal");
    if (event.target === modal) {
        closeRules();
    }
}
window.addEventListener("click", handleOutsideClick);
window.addEventListener("touchstart", handleOutsideClick);





// ========== Online P2P game Modal ==========
document.getElementById("OnlineStartButton").addEventListener("click", function () {
    const modal = document.getElementById("PeerModal");
    //closeRules();
    //closeWinSettings();
    modal.style.display = "inline";

    // 少し遅れてからイベントを追加（例：100ms後）
    setTimeout(() => {
        window.addEventListener("click", handleOutsideClick_PeerModal);
        window.addEventListener("touchstart", handleOutsideClick_PeerModal);
    }, 100);
});
// 閉じる関数
function closePeerModal() {
    document.getElementById("PeerModal").style.display = "none";
    // リスナーを削除しておく
    window.removeEventListener("click", handleOutsideClick_PeerModal);
    window.removeEventListener("touchstart", handleOutsideClick_PeerModal);
}
// モーダル外をクリック / タップした場合に閉じる
function handleOutsideClick_PeerModal(event) {
    const modal = document.getElementById("PeerModal");
    if (!modal.contains(event.target)) {
        closePeerModal();
    }
}





// ========== hint functions (calculation by cos similarity) ==========
// show three closest materials
document.getElementById("hint_button").addEventListener("click", function () {
    let closestMaterials = findClosestMaterials(p2_hand);
    
    let tableBody = document.getElementById("hintTable").getElementsByTagName("tbody")[0];
    tableBody.innerHTML = ""; // 既存のデータをクリア

    if (closestMaterials.length === 0) {
        let row = tableBody.insertRow();
        let cell = row.insertCell(0);
        cell.colSpan = 3;
        cell.innerHTML = "近い物質が見つかりません";
        cell.style.textAlign = "center";
        return;
    }

    closestMaterials.forEach((match) => {
        let material = materials[match.index];

        let row = tableBody.insertRow();
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        let cell3 = row.insertCell(2);

        cell1.innerHTML = material.a;  // 物質名
        cell2.innerHTML = material.b;  // 組成式
        cell3.innerHTML = material.c;  // 類似度
    });

    document.getElementById("hintContainer").style.display = "inline"; // 表示
});
// convert to vector for hand
function convertToVector2(hand, elementDict) {
    let vector = new Array(elementDict.length).fill(0);
    hand.forEach(el => {
        let index = elementDict.indexOf(el);
        if (index !== -1) vector[index]++;  // 各元素の出現回数をカウント
    });
    return vector;
}
// convert to vector for material
function convertToVector(material, elementDict) {
    return elementDict.map(el => material[el] || 0);
}
function cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        normA += vec1[i] ** 2;
        normB += vec2[i] ** 2;
    };

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return normA && normB ? dotProduct / (normA * normB) : 0;
}
function pseudoCosVec(materialNum1, materialNum2) {
    const vec1 = convertToVector(materials[materialNum1].d, element);
    const vec2 = convertToVector(materials[materialNum2].d, element);
    console.log(vec1, vec2);
    const cos = cosineSimilarity(vec1, vec2);
    return cos;
}
// find closest material for hint
function findClosestMaterials(hand) {
    let handVector = convertToVector2(hand, element);
    
    let similarities = materials.map((material, index) => {
        let materialVector = new Array(element.length).fill(0);
        
        // 物質の組成 `d` をベクトル化
        for (let [el, count] of Object.entries(material.d)) {
            let elIndex = element.indexOf(el);
            if (elIndex !== -1) materialVector[elIndex] = count;  // 各元素の数を考慮
        }

        return { index, similarity: cosineSimilarity(handVector, materialVector) };
    });

    // コサイン類似度が高い順にソートし、上位3つを取得
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}
// find closest material for AI training
function findClosestMaterial(handVector) {
    let bestMatch = null;
    let bestSimilarity = 0; // 類似度が0より大きいもののみ対象にする

    materials.forEach((material, index) => {
        let materialVec = Object.values(material.d); // 元素のベクトル化
        let similarity = cosineSimilarity(handVector, materialVec);

        // 類似度が 0 より大きく、かつ最大のものを採用
        if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = { index, similarity };
        };
    });

    return bestMatch; // bestMatch が null のままなら見つかってない
}
// find highest point material from p2_hand
async function findMostPointMaterial() {
    const possibleMaterials = await search_materials(arrayToObj(p2_hand));
    
    if (possibleMaterials.length === 0) {
        console.log("p2_hand 内で作成可能な物質はありません。");
    } else {
        const highestMaterial = possibleMaterials.reduce((max, material) => 
            material.c > max.c ? material : max, possibleMaterials[0]);
        console.log(`p2_hand 内で最もポイントが高い物質: ${highestMaterial.a} (ポイント: ${highestMaterial.c})`);
    };
}





// ========== game reset and start ==========
let materials = [];
let imageCache = {};
let peerID;
let GameType;
let JSZip;
// init web game
document.addEventListener('DOMContentLoaded', async function () {
     await preloadBackgroundImages();
     await preloadImages();
     await loadModel();
     await init_json();
     await initializeMaterials();     // ← materials がここで読み込み完了

    /* ───────────── 直前に開いていた辞書モーダルを復元 ───────────── */
    const last = sessionStorage.getItem('lastDictionary');  // ← openMoleculeDetail で保存しておいた ID
    if (last) {
        const m = materials.find(x => x.b === last);        // b プロパティが ID
        if (m) {
            switchTab('dictionary');  // 辞書タブへ
            openMoleculeDetail(m);    // モーダルを再表示
        }
    }
    /* ──────────────────────────────────────────────────────── */

     await loadQuestsStatus();
     peerID = await generatePeerID();
     peer = new Peer(peerID);
     peer.on('open', id => {
         console.log(id);
         document.getElementById('my-id').innerText = `自分のPeerID：${id}`;
         document.getElementById("PeerModal").style.display = "none";
     });
     peer.on('connection', connection => {
         conn = connection;
         if (MineTurn === null) {
             MineTurn = "p2"; // 後から接続した側は p2
         }
         setupConnection();
     });
     fetchRankingRealtime();
     document.getElementById("loading").style.display = "none";
     document.getElementById("startButton").style.display = "inline";
     document.getElementById("OnlineStartButton").style.display = "inline";
     JSZip = (await import('https://cdn.skypack.dev/jszip@3.10.0')).default;
});

// initialize hand
function random_hand() {
    for (let i = 0; i < card_num; i++) {
        p1_hand.push(drawCard());
        p2_hand.push(drawCard());
    };
}
// load materials JSON file (initialize)
async function init_json() {
    compoundsURL = "https://kurorosuke.github.io/compounds/obf_extended_min.json"
    materials = await loadMaterials(compoundsURL);
}
// load materials from url
async function loadMaterials(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        let outputNum = model ? model.outputs[0].shape[1] : 108;

        if (!data.material || !Array.isArray(data.material)) {
            document.getElementById("Attention2").style.display = "inline";
            return [];
        };
        document.getElementById("Attention2").style.display = "none";
        
        console.log(data.material.length)
        if (outputNum!=data.material.length) {
            const att = document.getElementById("Attention4");
            att.innerHTML = `モデルは出力${outputNum}個に対応していますが、compoundsは${data.material.length}個です`;
            att.style.display="inline";
        } else {
            document.getElementById("Attention4").style.display = "none";
        };
        
        return data.material;
    } catch (error) {
        console.error("Error fetching compounds:", error);  // Log the error to the console for debugging
        document.getElementById("Attention2").style.display = "inline";
        return []; // Return an empty array in case of error
    };
}
// preload card images
async function preloadImages() {
    const imageNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 26, 29, 30, 53];

    // 画像読み込みのPromise配列を作成
    const promises = imageNumbers.map(async (num) => {
        try {
            const imageUrl = `../images/${num}.webp`;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            imageCache[num] = blob;
        } catch (error) {
            console.error(`Image loading error: ${num}`, error);
        };
    });

    // 並列実行を待つ
    await Promise.all(promises);
    console.log("✅ 全画像のプリロード完了");
}
// preload background image
async function preloadBackgroundImages() {
    const isMobile = window.innerWidth <= 730;
    const url = isMobile ? '../images/start_screen_mobile.webp' : '../images/start_screen_desktop.webp';

    try {
        const response = await fetch(url, { cache: "force-cache" });
        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);

        // 一応画像読み込ませておく（なくてもOK）
        const img = new Image();
        img.src = objectURL;
        img.style.display = "none";
        document.body.appendChild(img);

        // 💥 ここで背景にセット
        const screen = document.getElementById("startScreen");
        screen.style.backgroundImage = `url('${objectURL}')`;

        console.log("✅ 背景画像読み込み＆設定完了:", url);
    } catch (err) {
        console.error("背景画像の読み込みに失敗", url, err);
    };
}
// start game with CPU
document.getElementById("startButton").addEventListener("click", function() {
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("p1_area").style.display = "block";
    document.getElementById("dropped_area_p1").style.display = "block";
    document.getElementById("dropped_area_p2").style.display = "block";
    document.getElementById("p2_area").style.display = "block";
    document.getElementById("gameRuleButton").style.display = "none";
    document.getElementById("predictResultContainer").style.display = "none";
    document.getElementById("centerLine").style.display = "block";
    MineTurn = "p2";
    GameType = "CPU";
    inGameQuest.style.display = 'block';
    changeQuest(); // ゲーム開始時にクエスト情報を更新
    resetGame();
});
// reset game state
function resetGame() {
    document.getElementById("bottomNav").style.display = "none";
    p1_hand = [];
    p2_hand = [];
    dropped_cards_p1 = [];
    dropped_cards_p2 = [];
    p1_selected_card = [];
    p2_selected_card = [];
    time = "game";
    
    if (GameType=="P2P") {
        if (MineTurn=="p1") {
            turn = Math.random() <= 0.5 ? "p1" : "p2";
            console.log(`random turn :: ${turn}`)
            changeTurn(turn);
        }
    } else {
        document.getElementById("generate_button").style.display = "inline";
    }
    p1_finish_select = true;
    p2_finish_select = true;

    document.getElementById("p1_point").innerHTML = `ポイント：${p1_point}`;
    document.getElementById("p2_point").innerHTML = `ポイント：${p2_point}`;
    document.getElementById("p2_explain").innerHTML = " ";
    document.getElementById("predictResult").innerHTML = " ";
    const ExplainArea = document.getElementById("p1_explain")
    ExplainArea.innerHTML = " ";
    ExplainArea.style.color = "black";
    ExplainArea.style.fontSize = "16px";

    document.getElementById("done_button").style.display = "none";
    document.getElementById("nextButton").style.display = "none";
    deck = [...elements, ...elements];
    deck = shuffle(deck);

    const p1_hand_element = document.getElementById("p1_hand");
    const p2_hand_element = document.getElementById("p2_hand");
    p1_hand_element.innerHTML = "";
    p2_hand_element.innerHTML = "";

    const dropped_area_p1_element = document.getElementById("dropped_area_p1");
    const dropped_area_p2_element = document.getElementById("dropped_area_p2");
    dropped_area_p1_element.innerHTML = "";
    dropped_area_p2_element.innerHTML = "";

    random_hand();
    view_p1_hand();
    view_p2_hand();
    document.getElementById("hint_button").style.display = "inline";

    //もし最初、自分のターンじゃないなら相手から実行
    if (turn !== MineTurn && GameType=="CPU") {
        setTimeout(() => p1_action(), 500);
    };
}
// return to screen
function returnToStartScreen() {
    document.getElementById("startScreen").style.display = "flex";
    document.getElementById("p1_area").style.display = "none";
    document.getElementById("dropped_area_p1").style.display = "none";
    document.getElementById("dropped_area_p2").style.display = "none";
    document.getElementById("p2_area").style.display = "none";
    document.getElementById("gameRuleButton").style.display = "block";
    document.getElementById("predictResultContainer").style.display = "none";
    document.getElementById("centerLine").style.display = "none";
    document.getElementById("bottomNav").style.display = "flex";
    document.getElementById("nextButton").textContent = "次のゲーム";
    document.getElementById("inGameQuest").style.display = "none";
}

function startGame() {
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("p1_area").style.display = "block";
    document.getElementById("dropped_area_p1").style.display = "block";
    document.getElementById("dropped_area_p2").style.display = "block";
    document.getElementById("p2_area").style.display = "block";
    document.getElementById("gameRuleButton").style.display = "none";
    document.getElementById("nextButton").textContent = "次のゲーム";
    resetGame();
}





// ========== P2P communication ==========
let is_ok_p1 = false; let is_ok_p2 = false //true: OK  false: notOK
let p1_finish_select = true; let p2_finish_select = true //true: 未選択  false: 選択済み
let p1_make_material = {}; let p2_make_material; //p1が生成した物質が送られてきたときにMaterial形式で代入される
let peer; let conn;
async function finish_done_select(p1_make_material, p2_make_material_arg, who, isRon = false) {
    if (!p1_make_material || !p2_make_material_arg) {
        console.error("⚠️ material data is missing — finish_done_select aborted.");
        return;
    }

    const dora = await get_dora();
    console.log(`ドラ: ${dora}`);
    console.log(p1_make_material);
    console.log(p2_make_material_arg);

    let thisGame_p2_point = p2_make_material_arg.c;
    let thisGame_p1_point = p1_make_material.c;

    if (p2_make_material_arg.e?.includes?.(p1_make_material.b)) {
        thisGame_p2_point *= (1.5 + Math.random() / 2);
    } else if (p1_make_material.e?.includes?.(p2_make_material_arg.b)) {
        thisGame_p1_point *= (1.5 + Math.random() / 2);
    }

    if (Object.keys(p2_make_material_arg.d).includes(dora)) {
        thisGame_p2_point *= 1.5;
    } else if (Object.keys(p1_make_material.d).includes(dora)) {
        thisGame_p1_point *= 1.5;
    }

    if (isRon) {
        if (who === "p2") {
            thisGame_p2_point /= 1.2;
        } else {
            thisGame_p1_point /= 1.2;
        }
    }

    if (who === "p2") {
        thisGame_p1_point /= 1.5;
    } else {
        thisGame_p2_point /= 1.5;
    }

    thisGame_p2_point = Math.round(thisGame_p2_point);
    thisGame_p1_point = Math.round(thisGame_p1_point);

    p1_point += thisGame_p1_point;
    p2_point += thisGame_p2_point;

    document.getElementById("p1_point").innerHTML += `+${thisGame_p1_point}`;
    document.getElementById("p2_point").innerHTML += `+${thisGame_p2_point}`;
    document.getElementById("p2_explain").innerHTML = `生成物質：${p2_make_material_arg.a}, 組成式：${p2_make_material_arg.b}`;
    document.getElementById("p1_explain").innerHTML = `生成物質：${p1_make_material.a}, 組成式：${p1_make_material.b}`;

    sharePoints();
    winnerAndChangeButton();
}
// 1. まずは「is_ok_p1 と is_ok_p2 の両方が true になるのを待つ」関数。あんまりラグ関係ない
function waitUntilBothTrue(getVar1, getVar2, interval = 100) {
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            if (getVar1() && getVar2()) {
                clearInterval(timer);
                resolve();
            }
        }, interval);
    });
}
async function winnerAndChangeButton() {
    // 2. 勝者判定
    const winner = await win_check();
    
    document.getElementById("done_button").style.display = "none";
    const button = document.getElementById("nextButton");
    button.style.display = "inline";
  
    // 3. winner が false → 「次のゲーム」ボタン
    if (!winner) {
        console.log("次のゲーム");
        button.textContent = "次のゲーム";
        
        // クリック時の処理を async 化する
        button.addEventListener("click", async function () {
            // 4. is_ok_p1 と is_ok_p2 がともに true になるまで待つ
            is_ok_p2 = true;
            nextIsOK()
            button.style.display = "none";
            console.log("OK")
            await waitUntilBothTrue(
                () => is_ok_p1,
                () => is_ok_p2
            );
            is_ok_p1 = false
            is_ok_p2 = false
            // 5. 両方 OK なら、次のゲーム処理を実行
            numTurn += 1;
            resetGame();
            // addEventListener の重複を避けるため、一度ボタンを置き換える
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
    } else {
        console.log("ラウンド終了");
        button.textContent = "ラウンド終了";
        button.addEventListener("click", function () {
            p1_point = 0;
            p2_point = 0;
            numTurn = 1;
            const user = firebase.auth().currentUser;
            if (IsRankMatch && MineTurn=="p2") {updateRating(user.uid, opponentUid);}
            IsRankMatch = false;

            conn.close();

            resetGame();
            returnToStartScreen();
            button.style.display = "none";
            

            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
    }
}
async function generatePeerID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const symbols = '-_';
    
    // 先頭と末尾は英数字
    const firstChar = chars.charAt(Math.floor(Math.random() * chars.length));
    const lastChar = chars.charAt(Math.floor(Math.random() * chars.length));

    // 中間の4文字は英数字または記号
    let middle = '';
    const middleChars = chars + symbols;
    for (let i = 0; i < 4; i++) {
        middle += middleChars.charAt(Math.floor(Math.random() * middleChars.length));
    }

    return "EB3_" + firstChar + middle + lastChar;
}
function connectToPeer() {
    if (MineTurn === null) {
        MineTurn = "p1"; // 最初に接続する側を p1 に
        //console.log("✅ あなたはホスト (p1) になりました！");
    }
    const remoteId = document.getElementById('remote-id').value;
    document.getElementById("PeerModal").style.display = "none";
    conn = peer.connect(remoteId);
    setupConnection();
}
//データを受け取った時の処理
/* connection を必ず受け取る形に変更 */
function setupConnection() {
    /*--- DataConnection が open したら共通初期化 ---*/
    conn.on('open', () => {
        GameType = "P2P";

        /*   caller 側だけ role を送る  */
        if (MineTurn === "p1") {
            conn.send({ type: "role", value: "p2" });
        }

        document.getElementById("PeerModal").style.display = "none";
        startGame();          // ここで盤面生成
        shareVariable();      // 山札や手札を同期
    });

    /*--- 受信データ ---*/
    conn.on('data', data => {
        console.log("📩", data);

        /* role を受け取った側 (= p2) はここで MineTurn 確定 */
        if (data.type === "role") {
            MineTurn = data.value;   // "p2"
            turn     = "p1";       // ゲームは常に p1 から開始
            //changeTurn(turn);        // UI を開放
            return;                  // これだけは即 return
        }

        /* variables 同期 */
        if (data.type === "variables") {
            p1_hand   = data.p1_hand;
            deck      = data.deck;
            WIN_POINT = data.win_point;
            WIN_TURN  = data.win_turn;

            // ⬇⬇⬇ ここを修正: materials を読み込み終えてから盤面を作る ---------
            (async () => {
                materials = await loadMaterials(data.compounds_url);
                startGame();                            // ★ ゲストはここで盤面生成
            })();
            // -----------------------------------------------------------------

            return;
        }

        /* shareVariables（初期手札送り返し）*/
        if (data.type === "shareVariables") {
            p1_hand = p2_hand;
            GameType = "P2P";
            document.getElementById("PeerModal").style.display = "none";
            startGame();
            return;
        }

        /* ターン切替 */
        if (data.type === "turn") {
            turn = data.value;
            if (turn===MineTurn) {
                document.getElementById("generate_button").style.display = "inline";
            } else {
                document.getElementById("generate_button").style.display = "none";
            }
            return;
        }

        /* アクション共有 */
        if (data.type === "action") {
            if (data.action === "exchange") {
                deck = data.deck;
                dropped_cards_p1.push(data.otherData);

                const blob = imageCache[elementToNumber[data.otherData]];
                const img  = new Image();
                img.src   = URL.createObjectURL(blob);
                img.alt   = data.otherData;
                img.style.border = "1px solid #000";
                document
                    .getElementById("dropped_area_p1")
                    .appendChild(img);

                checkRon(data.otherData);

            } else if (data.action === "generate") {
                p2_make();
            }
            return;
        }

        /* 選択結果 */
        if (data.type === "selected") {
            p1_finish_select = false;
            p1_make_material = data.otherData;
            if (!p2_finish_select) {
                console.log(p2_make_material);
                finish_done_select(p1_make_material, p2_make_material, "p1");
            }
            return;
        }

        /* スコア同期 */
        if (data.type === "pointsData") {
            document.getElementById("p1_point").innerHTML += `+${data.p1_point - p1_point}`;
            document.getElementById("p2_point").innerHTML += `+${data.p2_point - p2_point}`;
            document.getElementById("p1_explain").innerHTML = data.p1_explain;
            document.getElementById("p2_explain").innerHTML = data.p2_explain;
            p1_point = data.p1_point;
            p2_point = data.p2_point;
            winnerAndChangeButton();
            return;
        }

        /* ラウンド継続合意 */
        if (data.type === "nextIsOK") {
            is_ok_p1 = true;
            return;
        }

        /* 個別フィールド更新（保険） */
        if (data.p1_hand !== undefined) p1_hand = data.p1_hand;
        if (data.deck   !== undefined) deck   = data.deck;
    });

    /*--- 切断 ---*/
    conn.on('close', () => {
        console.log(document.getElementById("nextButton").textContent);
        if (document.getElementById("nextButton").textContent === "次のゲーム") {
            console.log(document.getElementById("nextButton").textContent == "次のゲーム")
            console.log(document.getElementById("nextButton").textContent === "次のゲーム")
            alert("ゲーム終了");
            returnToStartScreen();
        }
    });
}
function shareVariable() {
    if (conn && conn.open) {
        if (MineTurn === "p1") {
            //console.log("📤 ホスト (p1) として変数送信！");
            console.log(turn);
            GameType = "P2P";
            conn.send({type: "variables",  p1_hand: p2_hand, deck: deck, PartnerTurn: MineTurn, win_point: WIN_POINT, win_turn: WIN_TURN, compounds_url: compoundsURL});
        } else {
            //console.log("📤 ゲスト (p2) として変数送信！");
            conn.send({type: "shareVariables", p1_hand: p2_hand });
        }
    } else {
        //console.log("⚠️ 接続が開かれていません！");
    }
}
function shareAction(action, otherData) {
    if (conn && conn.open) {
        conn.send({ type: "action", action: action, otherData: otherData, deck: deck });
    } else {
        console.error("⚠️ 接続が開かれていません！ アクションを送信できません。");
    }
}
function changeTurn(newTurn) {
    //console.log(`🔄 ターン変更: ${newTurn}`);
    if (conn && conn.open) {
        turn = newTurn;
        conn.send({ type: "turn", value: newTurn });
        if (turn === MineTurn) {
            document.getElementById("generate_button").style.display = "inline";
        } else {
            document.getElementById("generate_button").style.display = "none";
        }
    }
}
async function finishSelect() {
    //console.log(`${MineTurn}は選択が完了`);
    if (conn && conn.open) {
        p2_finish_select = false;
        console.log("complete send selected to other player")
        conn.send({ type: "selected", value: MineTurn, otherData: p2_make_material});
    }
}
async function sharePoints() {
    if (conn && conn.open) {
        p1_explain_copy = document.getElementById("p2_explain").textContent
        p2_explain_copy = document.getElementById("p1_explain").textContent
        //console.log(p1_explain_copy)
        //console.log(p2_explain_copy)
        conn.send({type: "pointsData", p1_point: p2_point, p1_explain: p1_explain_copy, p2_point: p1_point, p2_explain: p2_explain_copy})
    }
}
async function nextIsOK() {
    if (conn && conn.open) {
        conn.send({type: "nextIsOK", content: true})
    }
}

// Peer with account
function startPeer() {
    // DB登録
    const user = firebase.auth().currentUser;
    const userRef = database.ref("players/" + user.uid);
    userRef.update({ PeerID: peerID })
    document.getElementById("winSettingsModal").style.display = "none";
}
// get opponent's PeerID
/**
 * 待機中プレイヤー（IsSerched === true）の PeerID を 1 件だけ取得して返す。
 * ─ 見つからなければ null を返す
 * ─ 自分自身がヒットした場合も null
 * @param {string} myUserName  自分のノードキー
 * @returns {Promise<string|null>} 相手の PeerID または null
 */
async function getOpponentPeerID(myUserName) {
  try {
    // ①「待機中」のプレイヤーを 1 人だけ取得
    const snap = await database
      .ref('players')
      .orderByChild('IsSerched')
      .equalTo(true)
      .limitToFirst(1)
      .once('value');

    if (!snap.exists()) return null;

    // ② 見つかったノードのキーを取り出す
    const opponentKey = Object.keys(snap.val())[0];
    if (opponentKey === myUserName) return null;          // 自分だったら無視

    // ③ PeerID だけを読んでそのまま返す
    const peerIDSnap = await database
      .ref(`players/${opponentKey}/PeerID`)
      .once('value');

    return peerIDSnap.val() ?? null;                      // 取得失敗時は null
  } catch (err) {
    console.error('getOpponentPeerID error:', err);
    return null;
  }
}

/**
 * RankMatch — 完全に対称な 2 プレイヤーマッチメイク
 * 1. /rankQueue を transaction で占有 or 取得
 * 2. caller / callee を決定
 * 3. caller だけ peer.connect()、callee は待受
 */
let opponentUid;
let IsRankMatch = false;
async function RankMatch() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Google またはメールでログインしてください");
        return;
    }

    // ① 自分をキューに登録
    const queueRef = database.ref("rankQueue");
    const myEntryRef = await queueRef.push({
        uid    : user.uid,
        peerID : peer.id,
        ts     : firebase.database.ServerValue.TIMESTAMP   // 早押し順を決める
    });

    // ② キューを監視
    queueRef.on("value", async (snap) => {
        const list = snap.val();
        if (!list) return;

        const RankMatchButton = document.getElementById("RankMatchButton");
        RankMatchButton.innerHTML = "マッチング中...";
        RankMatchButton.setAttribute("aria-disabled", "false");
        // エントリをタイムスタンプ昇順で並べ替え
        const entries = Object.entries(list)
                              .sort(([, a], [, b]) => a.ts - b.ts);

        // まだ2人そろっていなければ待機続行
        if (entries.length < 2) return;

        const [firstKey,  first ] = entries[0];  // 先に押した人
        const [secondKey, second] = entries[1];  // 後から押した人

        let opponent;          // 相手プレイヤーのデータ
        let iAmCaller = false; // 自分が発信側 (= p1) なら true

        if (second.uid === user.uid) {
            // 自分が後から押した人 → caller (= p1)
            opponent   = first;
            iAmCaller  = true;
            opponentUid = first.uid;
            console.log(first);
            let snapshot = await firebase.database()
                .ref(`players/${opponentUid}`)    // ← players ノード直下に uid をキーとして保存している想定
                .once("value");           // 1 回だけ読む（リアルタイム監視しない）
            document.getElementById("opponentName").innerHTML = `${snapshot.Name}`;
            document.getElementById("opponentRate").innerHTML = `${snapshot.Rate}`;

            // キューを掃除（両エントリ削除）
            await queueRef.child(firstKey ).remove();
            await queueRef.child(secondKey).remove();
        } else if (first.uid === user.uid) {
            // 自分が先に押した人 → callee (= p2)
            opponent   = second;
            iAmCaller  = false;
            opponentUid = second.uid;
            console.log(second);
            let snapshot = await firebase.database()
                .ref(`players/${opponentUid}`)    // ← players ノード直下に uid をキーとして保存している想定
                .once("value");           // 1 回だけ読む（リアルタイム監視しない）
            document.getElementById("opponentName").innerHTML = `${snapshot.Name}`;
            document.getElementById("opponentRate").innerHTML = `${snapshot.Rate}`;
            // 待機側はキュー削除を caller にまかせる
        } else {
            // 自分は3人目以降。何もしない
            return;
        }

        // 監視解除（マッチング完了）
        queueRef.off("value");
        IsRankMatch = true;
        // ③ Peer 接続確立
        handShake(opponent, iAmCaller);
        RankMatchButton.innerHTML = "対戦";
        RankMatchButton.setAttribute("aria-disabled", "true");
    });
}
function handShake(opponent, iAmCaller) {

    if (iAmCaller) {
        /*************  caller  (= p1)  *************/
        MineTurn = "p1";
        turn     = "p1";

        opponentUid = opponent.peerID;
        console.log(opponentUid);
        conn = peer.connect(opponentUid, { reliable: true });

        conn.on('open', () => {
            // 相手を p2 に指定
            conn.send({ type: "role", value: "p2" });

            setupConnection();      // ★ caller も必ず渡す
            changeTurn(turn);           // 先手番 UI 開放
        });

    } else {
        /*************  callee (= p2)  *************/
        MineTurn = "p2";
        // 待受け側は peer.on('connection') で setupConnection 済み
    }
}
async function updateRating(winnerUid, loserUid) {
    console.log(loserUid);
    const ratingRef = database.ref("players");

    // 現在のレーティング取得
    const [winnerSnap, loserSnap] = await Promise.all([
        ratingRef.child(winnerUid).once("value"),
        ratingRef.child(loserUid).once("value")
    ]);

    const winnerRating = winnerSnap.child("Rate").val() || 100;
    const loserRating  = loserSnap .child("Rate").val() || 100;

    // ---- Elo計算 ----
    const K = 32;  // 更新係数

    // 期待勝率を計算
    const expectedWin  = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLose = 1 - expectedWin; // = 1 - expectedWin

    // 新しいレート計算
    const newWinnerRating = Math.round(winnerRating + K * (1 - expectedWin));
    const newLoserRating  = Math.round(loserRating + K * (0 - expectedLose));

    // Firebaseに保存
    const updates = {};
    updates[`${winnerUid}/Rate`] = newWinnerRating;
    updates[`${loserUid}/Rate`]  = newLoserRating;
    await ratingRef.update(updates);

    console.log(`レート更新完了: 勝者(${newWinnerRating}), 敗者(${newLoserRating})`);
}






let viewer3D = null;
function normalizeFormula(text) {
    const subscriptMap = {
        '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
        '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
    };
    const superscriptMap = {
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
        '⁺': '+', '⁻': '-'
    };
    // 文字ごとに置換
    let result = '';
    for (let char of text) {
        if (subscriptMap[char]) {
            result += subscriptMap[char];
        } else if (superscriptMap[char]) {
            result += superscriptMap[char];
        } else {
            result += char;
        }
    }
    return result;
}
function createOrGetViewer() {
    if (viewer3D) return viewer3D;          // 既にあれば再利用
    viewer3D = $3Dmol.createViewer('viewer3D', { backgroundColor: 'white' });
    window.addEventListener('resize', () => viewer3D.resize());
    return viewer3D;
}
function safeCreateViewer() {
    const box = document.getElementById('viewer3D');  
    if (box.offsetWidth === 0 || box.offsetHeight === 0) {
        // レイアウトが確定するまで待つ
        return new Promise(r => requestAnimationFrame(() => r(safeCreateViewer())));
    }
    // サイズがあるので安全
    return Promise.resolve(
        $3Dmol.createViewer(box, { backgroundColor: 'white' })
    );
}

async function view3DMaterial(formula) {
    const v = createOrGetViewer();
    v.removeAllModels(); v.removeAllShapes();

    const url = `https://kurorosuke.github.io/MolData/${await normalizeFormula(formula)}.mol`;
    const mol = await (await fetch(url)).text();
    //console.log(mol);

    v.addModel(mol, 'sdf');
    v.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
    v.zoomTo(); v.render();
}



let markdownToggleCleanup = null;
let material4explain;
// 分子辞書の描画
function populateDictionary() {
    const grid = document.getElementById('moleculeGrid');
    grid.innerHTML = '';

    filterAndSortMaterials().forEach((material, index) => {
        const item = document.createElement('div');
        item.style.border = '1px solid #ccc';
        item.style.borderRadius = '10px';
        item.style.padding = '10px';
        item.style.textAlign = 'center';
        item.style.backgroundColor = '#fff';
        item.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.1)';

        const name = document.createElement('h4');
        name.textContent = material.a;
        name.style.margin = '5px 0';

        const formula = document.createElement('p');
        formula.textContent = material.b;

        const point = document.createElement('p');
        point.textContent = `ポイント: ${material.c}`;

        item.appendChild(name);
        item.appendChild(formula);
        item.appendChild(point);

        // クリック時に詳細表示
        item.addEventListener('click', () => {
            openMoleculeDetail(material, index);
        });

        grid.appendChild(item);
    });
}

function openMoleculeDetail(material) {
    material4explain =  material; // initMarkdownToggleで重複して動作させない
    sessionStorage.setItem('lastDictionary', material.b);
    /* --- テキスト ---- */
    detailName.textContent      = material.a;
    detailFormula.textContent   = `組成式: ${material.b}`;
    detailPoint.textContent     = `ポイント: ${material.c}`;
    detailAdvantage.textContent = `有利な物質: ${material.e.join(', ')}`;


    /* --- モーダルを表示して高さを確定 --- */
    moleculeDetailModal.style.display = 'block';

    /* --- 次のフレームでモデルを読み込む (高さが確定してから) --- */
    requestAnimationFrame(() => view3DMaterial(material.b));

    detailDescription.value = '';
    initMarkdownToggle(material);
}


function closeMoleculeDetail() {
    document.getElementById('moleculeDetailModal').style.display = 'none';
    sessionStorage.removeItem('lastDictionary');
}

/* ===== Markdown 説明：保存／読込 ===== */
const makeDescKey = id => `description_${id}`;          // 衝突防止プレフィックス

async function saveDescription(id, text) {              // 保存
  await setItem(makeDescKey(id), text);
}

async function loadDescription(id) {                    // 読込（なければ null）
  return await getItem(makeDescKey(id));
}

/* ===== Markdown 編集／閲覧トグル ===== */
function initMarkdownToggle(material) {
  const textarea = document.getElementById('detailDescription');
  const preview  = document.getElementById('markdownPreview');
  const editBtn  = document.getElementById('editButton');
  const saveBtn  = document.getElementById('saveButton');

  async function showPreview() {
    // 1) Markdown → HTML
    preview.innerHTML = marked.parse(textarea.value);

    // 2) TeX → SVG/HTML via MathJax (runs after MathJax is ready)
    if (window.MathJax && MathJax.typesetPromise) {
      await MathJax.typesetPromise([preview]);
    }

    // 3) UI toggle
    textarea.style.display = 'none';
    preview.style.display  = 'block';
    saveBtn.style.display  = 'none';
    editBtn.style.display  = 'inline-block';

    // 4) auto‑save
    await saveDescription(material.b, textarea.value);
  }

  function showEditor() {
    textarea.style.display = 'block';
    preview.style.display  = 'none';
    saveBtn.style.display  = 'inline-block';
    editBtn.style.display  = 'none';
  }

  saveBtn.addEventListener('click', showPreview);
  editBtn.addEventListener('click', showEditor);

  // initial load
  loadDescription(material.b).then(text => {
    textarea.value = text ?? `[${material.a} の Wikipedia](https://ja.wikipedia.org/wiki/${material.a})<br>`;
    showPreview();
  });
}






let dictSearchQuery = '';
let dictSortOption  = 'nameAsc';
// ── 検索とソートをまとめて行う関数 ──
function filterAndSortMaterials() {
  // 1) 検索
  const filtered = materials.filter(m => {
    const q = dictSearchQuery.toLowerCase();
    return (
      m.a.toLowerCase().includes(q) ||  // 名前
      m.b.toLowerCase().includes(q)     // 組成式
    );
  });

  // 2) ソート
  const sorted = filtered.sort((x, y) => {
    switch (dictSortOption) {
      case 'nameAsc' :  return  x.a.localeCompare(y.a, 'ja');
      case 'nameDesc':  return  y.a.localeCompare(x.a, 'ja');
      case 'pointAsc':  return  x.c - y.c;
      case 'pointDesc': return  y.c - x.c;
      default:          return 0;
    }
  });

  return sorted;
}

// ── 辞書 UI のイベント ──
document.getElementById('dictSearch').addEventListener('input', e => {
    dictSearchQuery = e.target.value;
    populateDictionary();
});
document.getElementById('dictSort').addEventListener('change', e => {
    dictSortOption = e.target.value;
    populateDictionary();
});


const quests = [
    { id: 1, name: "水を合成せよ", type:"create", target: "H₂O", completed: false, award: 50 },
    { id: 2, name: "25ポイント以上の物質を合成せよ", type:"point", targetPoint: 25, completed: false, award: 50 },
    { id: 3, name: "アセチレンを合成せよ", type: "create", target: "C₂H₂", completed: false, award: 50 },
    { id: 4, name: "オゾンを合成せよ", type: "create", target: "O₃", completed: false, award: 50 },
    { id: 5, name: "酸化ベリリウムを合成せよ", type: "create", target: "BeO", completed: false, award: 50 },
    { id: 6, name: "水素化リチウムを合成せよ", type: "create", target: "LiH", completed: false, award: 50 },
    { id: 7, name: "メチルを合成せよ", type: "create", target: "CH₃", completed: false, award: 50 },
    { id: 8, name: "アンモニアを合成せよ", type:"create", target: "NH₃", completed: false, award: 100 },
    { id: 9, name: "塩化ナトリウムを合成せよ", type: "create", target: "NaCl", completed: false, award: 50 },
    { id: 10, name: "シアン化水素を合成せよ", type:"create", target: "HCN", completed: false, award: 100 },
    { id: 11, name: "酢酸を合成せよ", type:"create", target: "CH₃COOH", completed: false, award: 150 },
    { id: 12, name: "亜リン酸を合成せよ", type:"create", target: "H₃PO₃", completed: false, award: 130 },
    { id: 13, name: "炭酸マグネシウムを合成せよ", type:"create", target: "MgCO₃", completed: false, award: 130 },
    { id: 14, name: "60ポイント以上の物質を合成せよ", type:"point", targetPoint: 60, completed: false, award: 100 },
    { id: 15, name: "ヨウ化カリウムを合成せよ", type: "create", target: "KI", completed: false, award: 50 },
    { id: 16, name: "過酸化水素を合成せよ", type: "create", target: "H₂O₂", completed: false, award: 75 },
    { id: 17, name: "窒化アルミニウムを合成せよ", type: "create", target: "AlN", completed: false, award: 75 },
    { id: 18, name: "二酸化ケイ素を合成せよ", type: "create", target: "SiO₂", completed: false, award: 75 },
    { id: 19, name: "炭酸を合成せよ", type: "create", target: "H₂CO₃", completed: false, award: 120 },
    { id: 20, name: "フッ化カルシウムを合成せよ", type: "create", target: "CaF₂", completed: false, award: 140 },
    { id: 21, name: "硫酸を合成せよ", type: "create", target: "H₂SO₄", completed: false, award: 180 },
    { id: 22, name: "硝酸を合成せよ", type: "create", target: "HNO₃", completed: false, award: 160 },
    { id: 23, name: "リン酸を合成せよ", type: "create", target: "H₃PO₄", completed: false, award: 200 },
    { id: 24, name: "80ポイント以上の物質を合成せよ", type: "point", targetPoint: 80, completed: false, award: 150 },
    { id: 25, name: "シュウ酸を合成せよ", type: "create", target: "O₃", completed: false, award: 250 },
    { id: 26, name: "100ポイント以上の物質を合成せよ", type: "point", targetPoint: 100, completed: false, award: 200 },
    { id: 27, name: "メタンを合成せよ", type: "create", target: "CH₄", completed: false, award: 80 },
    { id: 28, name: "ホルムアルデヒドを合成せよ", type: "create", target: "CH₂O", completed: false, award: 80 },
    { id: 29, name: "メタノールを合成せよ", type: "create", target: "CH₃OH", completed: false, award: 80 },
    { id: 30, name: "エタノールを合成せよ", type: "create", target: "C₂H₅OH", completed: false, award: 170 },
    { id: 31, name: "二酸化三鉄（酸化鉄II）を合成せよ", type: "create", target: "Fe₂O₃", completed: false, award: 150 },
    { id: 32, name: "チオシアン酸アンモニウムを合成せよ", type: "create", target: "NH₄SCN", completed: false, award: 170 },
    { id: 33, name: "チオ硫酸ナトリウムを合成せよ", type: "create", target: "Na₂S₂O₃", completed: false, award: 200 },
    { id: 34, name: "リン酸二水素ナトリウムを合成せよ", type: "create", target: "NaH₂PO₄", completed: false, award: 180 },
    { id: 35, name: "120ポイント以上の物質を合成せよ", type: "point", targetPoint: 120, completed: false, award: 250 },
    { id: 36, name: "ホウ酸を合成せよ", type: "create", target: "H₃BO₃", completed: false, award: 130 },
    { id: 37, name: "ヨウ素酸カリウムを合成せよ", type: "create", target: "KIO₄", completed: false, award: 130 },
    { id: 38, name: "リン酸水素ナトリウムを合成せよ", type: "create", target: "Na₂HPO₄", completed: false, award: 180 },
];
let currentQuestIndex = 0;

// game.js の changeQuest を書き換える

function changeQuest() {
    // 全てのクエストをクリアしていたらメッセージを表示
    const questListDiv = document.getElementById('questList');
    questListDiv.innerHTML = ''; // リストをクリア

    const completed   = quests.filter(q => q.completed).length;
    const total       = quests.length;
    const percent     = Math.round(completed / total * 100);

    const bar         = document.getElementById('questProgress');
    bar.style.width   = percent + '%';
    bar.textContent   = percent + '%';

    if (currentQuestIndex < quests.length) {
        const current = quests[currentQuestIndex];
        document.getElementById('questTitle').textContent = `クエスト：${current.name}`;
        currentQuestName.textContent = `クエスト名: ${current.name}`;

        if (current.type === 'create') {
            currentQuestTarget.textContent = `目標: ${current.target} を合成`;
        } else if (current.type === 'point') {
            currentQuestTarget.textContent = `目標: ${current.targetPoint} ポイント獲得`;
        }

    } else {
        document.getElementById('questTitle').textContent = '全てのクエストをクリアしました！';
        currentQuestName.textContent = '全てのクエストをクリアしました！';
        currentQuestTarget.textContent = '';
    }

    //クエスト一覧を表示
    quests.forEach((quest, index) => {
        if (!quest.completed) {
            const questFrame = document.createElement('div');
            const questItem = document.createElement('p');
            questItem.textContent = `${quest.name}`;
            questFrame.style.border = "1px solid black";
            questFrame.style.textAlign = "left";
            questFrame.style.padding = "0 0 0 15px";
            questFrame.appendChild(questItem);
            questListDiv.appendChild(questFrame);
        }
    });
    questListDiv.style.margin = "0 0 20px 0";
}

// IndexedDBからクエストの達成状況を読み込む関数
async function loadQuestsStatus() {
    const savedQuests = await getItem("questsStatus");
    myXP = await getItem("myXP");
    if (savedQuests && savedQuests.length === quests.length) {
        // 保存されたデータがあれば、現在のquests配列にcompleted状態を復元
        quests.forEach((quest, index) => {
            quest.completed = savedQuests[index].completed;
        });
        console.log("クエストの達成状況を読み込みました。");
    }
    // 現在のクエストを更新
    currentQuestIndex = quests.findIndex(q => !q.completed);
    if (currentQuestIndex === -1) currentQuestIndex = quests.length; // 全てクリア済み
}

// IndexedDBにクエストの達成状況を保存する関数
async function saveQuestsStatus() {
    await setItem("questsStatus", quests);
    console.log("クエストの達成状況を保存しました。");
}

// game.js の checkQuest を書き換える

/**
 * 現在のクエストが達成されたか判定し、達成されていれば報酬処理を行う
 * @param {object} madeMaterial - プレイヤーが生成した物質のオブジェクト
 */
async function checkQuest(madeMaterial, madePoint) {
    // まだ達成されていないクエストがあるか確認
    if (currentQuestIndex >= quests.length) {
        console.log("全てのクエストをクリア済みです。");
        return; // 全クリ済みなら何もしない
    }

    const current = quests[currentQuestIndex];

    // 達成判定：生成物質の組成式とクエストのターゲットが一致するか
    if (current.type === 'create') {
        if (!current.completed && madeMaterial.b === current.target) {
            console.log(`✅ クエスト達成！: ${current.name}`);
            current.completed = true; // 達成済みにする
            currentQuestIndex++; // 次のクエストへ
            changeQuest(); // クエスト達成時に表示を更新
            saveQuestsStatus(); // クエストの状態を保存
        }
    } else if (current.type === 'point') {
        if (!current.completed && madePoint >= current.targetPoint) { // pointタイプの場合はmadePointを比較
            console.log(`✅ クエスト達成！: ${current.name}`);
            current.completed = true; // 達成済みにする
            currentQuestIndex++; // 次のクエストへ
            changeQuest(); // クエスト達成時に表示を更新
            saveQuestsStatus(); // クエストの状態を保存
        }
    }
    // ★★★ 報酬処理をここに記述 ★★★
    myXP += current.award;
    await setItem("myXP", myXP);

    // 達成状況を保存
    await saveQuestsStatus();

    // UIを更新
    changeQuest();
}

function toggleQuestModal() {
    const inGameContent = document.getElementById("inGameQuestContent");
    inGameContent.style.display==="block" ? inGameContent.style.display = "none" : inGameContent.style.display = "block";
}
