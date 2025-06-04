let p1_hand = []; let p2_hand = []
let p1_point = 0; let p2_point = 0
let p1_selected_card = []; let p2_selected_card = []

const card_num = 8 //カードの枚数。基本的に8枚
let WIN_POINT = 250
let WIN_TURN = 10
let numTurn = 0

let dropped_cards_p1 = []; let dropped_cards_p2 = [] //捨てられた牌が集められる。

let is_ok_p1 = false; let is_ok_p2 = false //true: OK  false: notOK
let p1_finish_select = true; let p2_finish_select = true //true: 未選択  false: 選択済み
let p1_make_material = {} //p1が生成した物質が送られてきたときにMaterial形式で代入される

let turn = "p1" //現在のターン。変わるときに相手に送られる（変わった後のが）
let time = "game" //現在は何をするターンか。 game: カードを選択すると交換  make: カードを選択するとそのカードを使用

const elementToNumber = {"H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8, "F": 9, "Ne": 10,"Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15, "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20,"Fe": 26, "Cu": 29, "Zn": 30, "I": 53}
const elements = [...Array(6).fill('H'), ...Array(4).fill('O'), ...Array(4).fill('C'),'He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca','Fe', 'Cu', 'Zn', 'I']
const element = ['H','O','C','He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca','Fe', 'Cu', 'Zn', 'I']
let deck = [...elements, ...elements]
let materials = []
let imageCache = {}


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

function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInAnonymously(provider).catch(error => {
        alert("ログイン失敗：" + error.message);
    });
}
function logout() {
    auth.signOut();
}
function loginAndStart() {
    auth.signInAnonymously()
    .then((userCredential) => {
        const uid = userCredential.user.uid;
        console.log("ログイン成功: ", uid);
        startPeer(uid);
    })
    .catch((error) => {
        console.error("ログイン失敗: ", error);
        alert("ログインに失敗しました");
    });
}


//ゲームに必要な物の読み込み（開始）
async function loadMaterials() {
    const response = await fetch('https://kurorosuke.github.io/compounds/obf_standard_min.json')
    const data = await response.json()
    if (!data.material || !Array.isArray(data.material)) {
        return []
    }
    return data.material
}
async function preloadImages() {
    let imageNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 26, 29, 30, 53];
    for (let num of imageNumbers) {
        try {
            const imageUrl = `../images/${num}.webp`;
            console.log(`Fetching image: ${imageUrl}`);
            const response = await fetch(imageUrl);
            console.log(`Response status for ${num}: ${response.status}`);
            if (!response.ok) throw new Error(`Failed to load image: ${num}`);
            const blob = await response.blob();
            if (!blob) throw new Error(`Blob is null for image ${num}`);
            imageCache[num] = blob;
            console.log(`Loaded image: ${num}`, blob);
        } catch (error) {
            console.error(`Image loading error: ${num}`, error);
        }
    }
}
async function init_json() {
    materials = await loadMaterials()
}
function startPeer(uid) {
    peer = new Peer(uid);
    peer.on('open', id => {
        console.log("Peer起動: ", id);
        document.getElementById('my-id').innerText = `自分のID：${id}`;
        // DB登録
        database.ref('waiting_players/' + id).set({
            peerId: id,
            timestamp: Date.now()
        });
        document.getElementById("winSettingsModal").style.display = "none";
    });
    peer.on('connection', connection => {
        conn = connection;
        if (name === null) name = "p2";
        setupConnection();
    });
}
document.addEventListener('DOMContentLoaded', function () {
    preloadImages().then(elem => {
        init_json();
        deck = [...elements, ...elements];
        deck = shuffle(deck);
        random_hand();
        view_p1_hand();
        view_p2_hand();
        turn = "p1";
        loginAndStart();
    })
})
//ゲームに必要な物の読み込み（終了）

//手札の表示（開始）
async function view_p2_hand() {
    const area = document.getElementById('p2_hand')
    p2_hand.forEach((elem, index) => {
        const blob = imageCache[elementToNumber[elem]];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = elem
        image.style.padding = "5px"
        image.style.border = "1px solid #000"
        image.classList.add("selected")
        image.classList.toggle("selected")
        image.addEventListener("click", function() {
            const button = document.getElementById("ron_button")
            button.style.display = "none"
            if (time == "make") {
                this.classList.toggle("selected")
                if (this.classList.contains("selected")){
                    p2_selected_card.push(this.alt)
                } else {
                    p2_selected_card.splice(p2_selected_card.indexOf(this.alt),1)
                }}
            if (turn == name && time == "game") {
                dropped_cards_p2.push(this.alt)
                const blob = imageCache[elementToNumber[this.alt]];
                const img = new Image();
                img.alt = this.alt;
                img.style.padding = "5px"
                img.style.border = "1px solid #000"
                img.src = URL.createObjectURL(blob);
                document.getElementById("dropped_area_p2").appendChild(img)
                this.classList.remove("selected")
                this.classList.add("selected")
                this.classList.toggle("selected")
                let newElem = drawCard()
                
                const newBlob = imageCache[elementToNumber[newElem]];
                this.src = URL.createObjectURL(newBlob);
                this.alt = newElem
                p2_hand[index] = newElem
                //console.log(turn)
                turn = (turn == "p2") ? "p1" : "p2";
                changeTurn(turn)
                shareAction(action="exchange",otherData=img.alt)
            }
        })
        area.appendChild(image)
    })
}
async function view_p1_hand() {
    const area = document.getElementById('p1_hand')
    p1_hand.forEach((elem, index) => {
        const blob = imageCache[0];
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.alt = "相手の手札"
        image.style.padding = "5px"
        image.style.border = "1px solid #000"
        image.classList.add("selected")
        image.classList.toggle("selected")
        area.appendChild(image)
    })
}
//手札の表示（終了）

//生成する物質の選択（開始）
async function p2_make() {
    // ボタンの表示を変更
    time = "make"
    document.getElementById("generate_button").style.display = "none";
    document.getElementById("ron_button").style.display = "none";
    const button = document.getElementById("done_button");
    button.style.display = "inline";

    // 以前のイベントリスナーを削除して新しく作成
    button.replaceWith(button.cloneNode(true));
    const newButton = document.getElementById("done_button");

    // ボタンクリックを待機
    return new Promise((resolve) => {
        newButton.addEventListener("click", function () {
            const newButton = document.getElementById("done_button");
            newButton.style.display = "none";
            const p2_make_material = search(arrayToObj(p2_selected_card));
            resolve(p2_make_material);
            finishSelect();
        });
    });
}
//生成する物質の選択（終了）

async function finish_done_select(p1_make_material,p2_make_material,who,isRon=false) {
    dora = await get_dora();
    //console.log(`ドラ: ${dora}`);
    //console.log(p1_make_material)
    //console.log(p2_make_material)
    
    let thisGame_p2_point = p2_make_material.c;
    let thisGame_p1_point = p1_make_material.c;

    // 有利な生成物の場合のボーナス
    if (Boolean(p2_make_material.e.includes(p1_make_material.b))) {
        thisGame_p2_point *= (1.5 + Math.random() / 2);
    } else if (Boolean(p1_make_material.e.includes(p2_make_material.b))) {
        thisGame_p1_point *= (1.5 + Math.random() / 2);
    }

    // 役の中にドラが含まれる場合のボーナス
    if (Boolean(Object.keys(p2_make_material.d).includes(dora))) {
        thisGame_p2_point *= 1.5;
    } else if (Boolean(Object.keys(p1_make_material.d).includes(dora))) {
        thisGame_p1_point *= 1.5;
    }

    // **ロン時のボーナス**
    if (isRon) {
        who == "p2" ? thisGame_p2_point /= 1.2 : thisGame_p1_point /= 1.2
    }

    who == "p2" ? thisGame_p1_point /= 1.5 : thisGame_p2_point /= 1.5;

    // 小数点以下を四捨五入
    thisGame_p2_point = Math.round(thisGame_p2_point);
    thisGame_p1_point = Math.round(thisGame_p1_point);

    // 得点を更新
    p1_point += await thisGame_p1_point;
    p2_point += await thisGame_p2_point;

    console.log(thisGame_p1_point)
    console.log(thisGame_p2_point)

    // 画面に反映
    document.getElementById("p2_point").innerHTML += `+${thisGame_p2_point}`;
    document.getElementById("p1_point").innerHTML += `+${thisGame_p1_point}`;
    document.getElementById("p2_explain").innerHTML = `生成物質：${p2_make_material.a}, 組成式：${p2_make_material.b}`;
    document.getElementById("p1_explain").innerHTML = `生成物質：${p1_make_material.a}, 組成式：${p1_make_material.b}`;

    sharePoints()

    winnerAndChangeButton()
}
// 1. まずは「is_ok_p1 と is_ok_p2 の両方が true になるのを待つ」関数を用意
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
        } 
        // 6. winner が true → 「ラウンド終了」ボタン
        else {
        console.log("ラウンド終了");
        button.textContent = "ラウンド終了";
        button.addEventListener("click", function () {
            returnToStartScreen();
            p1_point = 0;
            p2_point = 0;
            numTurn = 0;
            resetGame();
            button.style.display = "none";
            
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            conn.close();
        });
    }
}

//置き場
async function checkRon(droppedCard) {
    // ① P2のロン判定
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
            shareAction(action="generate", otherData=name);
        });
    }
}


//その他処理の関数定義（開始）
async function no_draw_card() {
    const p2_make_material = await p2_make();
    
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
    if (name === "p2") {
        console.log("done")
        finish_done_select(p1_make_material, p2_make_material, "no-draw", isRon=false);
    }
}
function drawCard() {
    return deck.length > 0 ? deck.pop() : (time = "make", no_draw_card());
}
function shuffle(array) {
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array
}
function arrayToObj(array) {
    let result = {}
    array.forEach(item => {
        if (result[item]) {
            result[item]++
        } else {
            result[item] = 1
        }
    })
    return result
}
async function search_materials(components) {
    return materials.filter(material => {
        for (const element in material.d) {
            if (!components[element] || material.d[element] > components[element]) {
                return false
            }
        }
        return true
    })
}
function random_hand() {
    for (let i = 0; i < card_num; i++) {
        p1_hand.push(drawCard())
        p2_hand.push(drawCard())
    }
}
async function search(components) {
    return materials.find(material => {
        for (const element in components) {
            if (!material.d[element] || material.d[element] !== components[element]) {
                return false;
            }
        }
        for (const element in material.d) {
            if (!components[element]) {
                return false;
            }
        }
        return true;
    }) || materials[0];
}
async function get_dora() {
    return element[Math.round(Math.random()*23)]
}
async function win_check() {
    return Math.abs(p1_point - p2_point) >= WIN_POINT ? p1_point>p2_point ? "p1": "p2" : numTurn >= WIN_TURN ? p1_point>p2_point ? "p1": "p2" : null
}
const generate_Button = document.getElementById("generate_button")
generate_Button.addEventListener("click", function () {
    if (turn === name) {
        p2_make()
        shareAction(action="generate",otherData=name)
    }
});

//その他処理の関数定義（終了）

//ゲーム後の初期化処理（開始）
function returnToStartScreen() {
    document.getElementById("startScreen").style.display = "flex";
    document.getElementById("p1_area").style.display = "none";
    document.getElementById("dropped_area_p1").style.display = "none";
    document.getElementById("dropped_area_p2").style.display = "none";
    document.getElementById("p2_area").style.display = "none";
    document.getElementById("gameRuleButton").style.display = "block";
}
function resetGame() {
    p1_hand = [];
    p2_hand = [];
    dropped_cards_p1 = [];
    dropped_cards_p2 = [];
    p1_selected_card = [];
    p2_selected_card = [];
    time = "game";
    turn = "p1"
    p1_finish_select = true;
    p2_finish_select = true;

    document.getElementById("p1_point").innerHTML = `ポイント：${p1_point}`;
    document.getElementById("p1_explain").innerHTML = "　";
    document.getElementById("p2_point").innerHTML = `ポイント：${p2_point}`;
    document.getElementById("p2_explain").innerHTML = "　";
    
    if (name == "p1") {
        document.getElementById("generate_button").style.display = "inline";
    }
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
}
//ゲーム後の初期化処理（終了）

//ルールの表示（開始）
window.onclick = function(event) {
    const modal = document.getElementById("rulesModal");
    if (event.target === modal) {
        closeRules();
    }
};
function startGame() {
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("p1_area").style.display = "block";
    document.getElementById("dropped_area_p1").style.display = "block";
    document.getElementById("dropped_area_p2").style.display = "block";
    document.getElementById("p2_area").style.display = "block";
    document.getElementById("gameRuleButton").style.display = "none";
}
function showRules() {
    document.getElementById("rulesModal").style.display = "block";
}
function closeRules() {
    document.getElementById("rulesModal").style.display = "none";
}
document.getElementById("closeRulesButton").addEventListener("click", closeRules);
//ルールの表示（終了）

//設定画面（開始）
function openWinSettings() {
    document.getElementById("winSettingsModal").style.display = "block";
}
function closeWinSettings() {
    document.getElementById("winSettingsModal").style.display = "none";
}
document.getElementById("setting_icon").addEventListener("click", function() {
    document.getElementById("winSettingsModal").style.display = "inline"
})
//設定画面（終了）







//P2P通信
let roomName;
let peer; // 合言葉をそのままPeer IDとして使う
let conn;
let name = null; // null = 未確定, "p1" = ホスト, "p2" = ゲスト


async function findOpponentAndConnect() {
    const snapshot = await database.ref('waiting_players').once('value');
    const players = snapshot.val();
    if (!players) {
        alert("相手がまだ待機していません");
        return;
    }
    const myId = peer.id;
    const opponentIds = Object.keys(players).filter(id => id !== myId);
    if (opponentIds.length === 0) {
        alert("今はまだ対戦相手がいません");
        return;
    }
    const opponentId = opponentIds[0];
    // 予約ロック的に削除
    await database.ref('waiting_players/' + opponentId).remove();
    // PeerJSで接続開始
    conn = peer.connect(opponentId);
    setupConnection();
}
function connectToPeer() {
    if (name === null) name = "p1";
    const isAuto = confirm("自動マッチングしますか？");
    if (isAuto) {
        findOpponentAndConnect();
    } else {
        const remoteId = document.getElementById('remote-id').value;
        conn = peer.connect(remoteId);
        setupConnection();
    }
}

//データを受け取った時の処理
function setupConnection() {
    conn.on('open', () => {
        //console.log('🔗 接続しました！');
        if (name === "p1") {
            conn.send({ type: "role", value: "p2" }); // ゲストに "p2" であることを通知
            conn.send({ type: "turn", value: turn }); // 現在のターンを送信
            if (turn != name) {
                document.getElementById("generate_button").style.display = "none";
            } else if (search_materials(arrayToObj(p2_hand))) {
                document.getElementById("generate_button").style.display = "inline";
            }
        }
        document.getElementById("winSettingsModal").style.display = "none";
        shareVariable();
        startGame();
    });
    //データの処理
    conn.on('data', data => {
        //console.log("📩 受信データ:", data);
        if (data.type === "role" && name === null) {
            name = data.value;
            //console.log(`✅ あなたは ${name} になりました！`);
        }
        if (data.type === "turn") {
            turn = data.value;
            if (turn != name) {
                document.getElementById("generate_button").style.display = "none";
            } else if (search_materials(arrayToObj(p2_hand))) {
                document.getElementById("generate_button").style.display = "inline";
            }
            //console.log(`🔄 ターン更新: ${turn}`);
        }
        if (data.type === "action") {
            if (data.action == "exchange") {
                deck = data.deck
                dropped_cards_p1.push(data.otherData)
                const blob = imageCache[elementToNumber[data.otherData]];
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                img.alt = data.otherData;
                img.style.padding = "5px"
                img.style.border = "1px solid #000"
                document.getElementById("dropped_area_p1").appendChild(img);
                checkRon(data.otherData);
            } else if (data.action == "generate") {console.log("generate this in get action of generate");p2_make()}
        }
        if (data.type === "selected") {
            p1_finish_select = false
            p1_make_material = data.otherData
            //console.log(data.otherData)
            if (p2_finish_select) {
            } else {
                console.log("get p1 selected & do finish_done_select");
                finish_done_select(p1_make_material, p2_make_material,"p1")
            }
            //もし自分がもうdoneしていたらdoneしない。
            //もしp2（自分）がもう上がっていたならすぐにfinish_done_select
        }
        if (data.type === "pointsData") {
            document.getElementById("p1_point").innerHTML += `+${data.p1_point - p1_point}`
            document.getElementById("p2_point").innerHTML += `+${data.p2_point - p2_point}`
            document.getElementById("p1_explain").innerHTML = data.p1_explain
            document.getElementById("p2_explain").innerHTML = data.p2_explain
            p1_point = data.p1_point
            p2_point = data.p2_point
            winnerAndChangeButton()
        }
        if (data.type === "nextIsOK") {
            is_ok_p1 = true
        }
        if (data.p1_hand !== undefined) p1_hand = data.p1_hand;
        if (data.deck !== undefined) deck = data.deck;
    });
}

function shareVariable() {
    if (conn && conn.open) {
        if (name === "p1") {
            //console.log("📤 ホスト (p1) として変数送信！");
            conn.send({ p1_hand: p2_hand, deck: deck, turn: turn });
        } else {
            //console.log("📤 ゲスト (p2) として変数送信！");
            conn.send({ p1_hand: p2_hand });
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
        conn.send({ type: "turn", value: newTurn });
        if (turn != name) {
            document.getElementById("generate_button").style.display = "none";
        } else if (search_materials(arrayToObj(p2_hand))) {
            document.getElementById("generate_button").style.display = "inline";
        }
    }
}

async function finishSelect() {
    //console.log(`${name}は選択が完了`);
    if (conn && conn.open) {
        p2_make_material = await search(arrayToObj(p2_selected_card))
        conn.send({ type: "selected", value: name, otherData: p2_make_material});
        p2_finish_select = false
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
