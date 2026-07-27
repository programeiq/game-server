const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS（通信制限）解除ミドルウェア
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// ゲームデータを保持するメモリ
let waitingPlayer = null;
let rooms = {};

// お題リスト
const THEMES = [
  "きのこの山 vs たけのこの里 どちらが優れているか？",
  "犬派 vs 猫派 ペットにするならどっち？",
  "朝型 vs 夜型 人生が豊かになるのはどっち？",
  "お金 vs 愛 人生で本当に大切なのはどっち？",
  "うどん vs そば 日本を代表する麺類はどっち？",
  "インドア vs アウトドア 休日の過ごし方はどっちが最高？",
  "ご飯派 vs パン派 最高の朝食はどっち？",
  "コーヒー派 vs 紅茶派 一日の始まりに飲むならどっち？",
  "夏 vs 冬 快適に過ごせる季節はどっち？",
  "海 vs 山 最高の休暇を過ごすならどっち？",
  "都会 vs 田舎 住んで幸せなのはどっち？",
  "電話 vs メール 連絡を取るならどっちが便利？",
  "紙の本 vs 電子書籍 読書をするならどっち？",
  "自炊 vs 外食 お金が貯まり、豊かなのはどっち？",
  "目覚まし時計 vs スマホの目覚まし 朝起きるならどっち？",
  "温泉 vs 遊園地 週末の旅行で行くならどっち？",
  "スニーカー vs 革靴 毎日履くならどっち？",
  "リュック vs ショルダーバッグ 普段使いならどっち？",
  "メガネ vs コンタクト 視力矯正するならどっち？",
  "腕時計 vs スマホ 時間を確認するならどっち？",
  "傘 vs 雨合羽 雨の日の移動はどっちが快適？",
  "目玉焼き vs 卵焼き 朝食の卵料理ならどっち？",
  "ショートケーキ vs チーズケーキ 好きなケーキはどっち？",
  "ハンバーガー vs ピザ ファストフードならどっち？",
  "ビール vs 日本酒 居酒屋で最初に頼むならどっち？",
  "焼肉 vs 寿司 ご褒美に食べるならどっち？",
  "カレー vs ラーメン 毎日でも食べたいのはどっち？",
  "餃子 vs 焼売 中華の定番ならどっち？"
];

// ランダムにお題を1つ選択
function getRandomTheme() {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

// 1. マッチング処理 API
app.get('/match', (req, res) => {
  const username = req.query.username || '名無しさん';

  // すでに待機中のプレイヤーがいるか確認
  if (waitingPlayer && waitingPlayer.username !== username) {
    const roomName = `room_${Date.now()}`;
    const selectedTheme = getRandomTheme();

    rooms[roomName] = {
      theme: selectedTheme,
      messages: [],
      hpData: {
        [waitingPlayer.username]: 2000,
        [username]: 2000
      }
    };

    const resultMessage = `MATCHING_SUCCESS | Room: ${roomName} | ${selectedTheme}`;
    
    // 待機プレイヤーへ通知を返すため response を一時保管
    waitingPlayer.res.send(resultMessage);
    waitingPlayer = null;

    return res.send(resultMessage);
  } else {
    // 自分が待機列に登録される
    waitingPlayer = { username, res };
  }
});

// 2. メッセージおよび状態取得 API
app.get('/get-messages', (req, res) => {
  const roomName = req.query.roomName;
  if (!roomName || !rooms[roomName]) {
    return res.json({ error: "ROOM_NOT_FOUND" });
  }

  res.json({
    theme: rooms[roomName].theme,
    messages: rooms[roomName].messages,
    hpData: rooms[roomName].hpData
  });
});

// 3. メッセージ送信 API
app.post('/send-message', (req, res) => {
  const { roomName, sender, text } = req.body;
  if (!roomName || !rooms[roomName]) {
    return res.status(400).send("Room not found");
  }

  rooms[roomName].messages.push({ sender, text });
  res.send("SUCCESS");
});

// 4. ゲーム終了・部屋削除 API
app.post('/game-over', (req, res) => {
  const { roomName } = req.body;
  if (roomName && rooms[roomName]) {
    delete rooms[roomName];
  }
  res.send("SUCCESS");
});

// 5. ランキング表示 API (ダミー表示)
app.get('/ranking', (req, res) => {
  res.send("1位: ゆる論マスター (Lv.100)\n2位: 論破キング (Lv.85)\n3位: ひよこ代表 (Lv.50)");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
