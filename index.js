const express = require('express');
const app = express();

// CORS設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const PORT = process.env.PORT || 3000;

let waitingPlayer = null;
let rooms = {};

// 空の状態でスタートするランキングデータ
let playerRankings = {};

// データの更新・保存関数
function saveOrUpdatePlayer(userId, name, level, exp, label) {
  if (!userId) return;

  const numLevel = parseInt(level) || 1;
  const numExp = parseInt(exp) || 0;
  const current = playerRankings[userId];

  if (
    !current ||
    numLevel > current.level ||
    (numLevel === current.level && numExp > current.exp) ||
    current.name !== name ||
    current.label !== label
  ) {
    playerRankings[userId] = {
      name: name || '名無し',
      level: numLevel,
      exp: numExp,
      label: label || '一般人',
      updatedAt: Date.now()
    };
  }
}

// 5分ごとの定期送信API
app.post('/update-score', (req, res) => {
  const { userId, name, level, exp, label } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  saveOrUpdatePlayer(userId, name, level, exp, label);
  res.json({ status: 'success', message: 'Ranking updated!' });
});

// マッチング処理
app.get('/match', (req, res) => {
  const username = req.query.username || '名無し';
  const userId = req.query.userId || `guest_${Date.now()}`;

  // 1. 待機中のプレイヤーが自分自身ならリセット
  if (waitingPlayer && (waitingPlayer.userId === userId || waitingPlayer.username === username)) {
    waitingPlayer = null;
  }

  // 2. 他の待機プレイヤーがいる場合 -> マッチング成立
  if (waitingPlayer) {
    const roomName = `room_${Date.now()}`;
    const themes = [
      { topic: "キノコの山 VS タケノコの里", sideA: "キノコの山", sideB: "タケノコの里" },
      { topic: "朝食は パン派 VS ごはん派", sideA: "パン派", sideB: "ごはん派" },
      { topic: "猫派 VS 犬派", sideA: "猫派", sideB: "犬派" },
      { topic: "夏 VS 冬", sideA: "夏", sideB: "冬" },
      { topic: "インドア VS アウトドア", sideA: "インドア", sideB: "アウトドア" },
      { topic: "都会派 VS 田舎派", sideA: "都会派", sideB: "田舎派" }
    ];
    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

    rooms[roomName] = {
      theme: selectedTheme.topic,
      sideA: selectedTheme.sideA,
      sideB: selectedTheme.sideB,
      messages: [],
      hpData: { [waitingPlayer.username]: 2000, [username]: 2000 }
    };

    const opponent = waitingPlayer;
    waitingPlayer = null;

    // 1人目（待っていた人） = 前者(sideA)
    opponent.res.send(`MATCHING_SUCCESS | Room: ${roomName} | ${selectedTheme.topic} | YOUR_SIDE: ${selectedTheme.sideA}`);
    
    // 2人目（今来た人） = 後者(sideB)
    res.send(`MATCHING_SUCCESS | Room: ${roomName} | ${selectedTheme.topic} | YOUR_SIDE: ${selectedTheme.sideB}`);

  } else {
    // 3. 誰も待っていない場合 -> 待機状態に登録
    waitingPlayer = { username, userId, res };

    // タイムアウト対策（25秒経過で一度リセットしてクライアントに再接続させる）
    const timeoutId = setTimeout(() => {
      if (waitingPlayer && waitingPlayer.res === res) {
        waitingPlayer = null;
        if (!res.headersSent) {
          res.send('WAITING_TIMEOUT');
        }
      }
    }, 25000);

    req.on('close', () => {
      clearTimeout(timeoutId);
      if (waitingPlayer && waitingPlayer.res === res) {
        waitingPlayer = null;
      }
    });
  }
});

// メッセージ送信
app.post('/send-message', (req, res) => {
  const { roomName, sender, text, hp } = req.body;
  if (rooms[roomName]) {
    rooms[roomName].messages.push({ sender, text });
    if (hp !== undefined) {
      rooms[roomName].hpData[sender] = hp;
    }
    res.json({ status: 'ok' });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// メッセージ取得
app.get('/get-messages', (req, res) => {
  const { roomName } = req.query;
  if (rooms[roomName]) {
    res.json(rooms[roomName]);
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

// ゲーム終了（部屋削除）
app.post('/game-over', (req, res) => {
  const { roomName } = req.body;
  if (rooms[roomName]) delete rooms[roomName];
  res.json({ status: 'cleaned' });
});

// ランキング取得API
app.get('/ranking', (req, res) => {
  let sortedList = Object.keys(playerRankings).map(id => {
    return {
      id: id,
      ...playerRankings[id]
    };
  }).sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.exp - a.exp;
  });

  if (sortedList.length === 0) {
    return res.send("[殿堂入り レベルランキング]\n\n現在ランキングデータはありません。");
  }

  let text = "[殿堂入り レベルランキング TOP10]\n\n";
  const top10 = sortedList.slice(0, 10);

  top10.forEach((player, index) => {
    const displayId = player.id.length > 12 ? player.id.substring(0, 10) + "..." : player.id;
    text += `${index + 1}位 : ${player.name} (ID: ${displayId})\n`;
    text += `       └ Lv.${player.level} [${player.label}]\n\n`;
  });

  res.send(text);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
