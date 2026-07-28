const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS（通信制限）解除
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
let playerRankings = {};

// お題リスト（全300個）
const THEMES = [
  // --- 食べ物・飲み物 ---
  { topic: "キノコの山 VS タケノコの里", sideA: "キノコの山", sideB: "タケノコの里" },
  { topic: "朝食は パン派 VS ごはん派", sideA: "パン派", sideB: "ごはん派" },
  { topic: "うどん VS そば", sideA: "うどん", sideB: "そば" },
  { topic: "焼肉 VS 寿司", sideA: "焼肉", sideB: "寿司" },
  { topic: "カレー VS ラーメン", sideA: "カレー", sideB: "ラーメン" },
  { topic: "コーヒー派 VS 紅茶派", sideA: "コーヒー派", sideB: "紅茶派" },
  { topic: "目玉焼きにかけるなら 醤油 VS ソース", sideA: "醤油", sideB: "ソース" },
  { topic: "ポテトチップス うすしお VS コンソメ", sideA: "うすしお", sideB: "コンソメ" },
  { topic: "たこ焼き VS お好み焼き", sideA: "たこ焼き", sideB: "お好み焼き" },
  { topic: "から揚げに レモンをかける VS かけない", sideA: "かける", sideB: "かけない" },
  { topic: "餃子 VS 焼売", sideA: "餃子", sideB: "焼売" },
  { topic: "つぶあん VS こしあん", sideA: "つぶあん", sideB: "こしあん" },
  { topic: "アイスクリーム VS かき氷", sideA: "アイスクリーム", sideB: "かき氷" },
  { topic: "和菓子 VS 洋菓子", sideA: "和菓子", sideB: "洋菓子" },
  { topic: "おにぎり VS サンドイッチ", sideA: "おにぎり", sideB: "サンドイッチ" },
  { topic: "納豆に入れるなら 生卵 VS キムチ", sideA: "生卵", sideB: "キムチ" },
  { topic: "ラーメンのスープは 醤油 VS とんこつ", sideA: "醤油", sideB: "とんこつ" },
  { topic: "ラーメンのスープは 味噌 VS 塩", sideA: "味噌", sideB: "塩" },
  { topic: "ビール VS ハイボール", sideA: "ビール", sideB: "ハイボール" },
  { topic: "ハンバーガー VS ピザ", sideA: "ハンバーガー", sideB: "ピザ" },
  { topic: "ショートケーキ VS チーズケーキ", sideA: "ショートケーキ", sideB: "チーズケーキ" },
  { topic: "マヨネーズ VS ケチャップ", sideA: "マヨネーズ", sideB: "ケチャップ" },
  { topic: "水は ミネラルウォーター VS 水道水", sideA: "ミネラルウォーター", sideB: "水道水" },
  { topic: "自炊 VS 外食", sideA: "自炊", sideB: "外食" },
  { topic: "目玉焼き VS 卵焼き", sideA: "目玉焼き", sideB: "卵焼き" },
  { topic: "納豆 VS 豆腐", sideA: "納豆", sideB: "豆腐" },
  { topic: "焼きそば VS チャーハン", sideA: "焼きそば", sideB: "チャーハン" },
  { topic: "唐揚げ VS フライドチキン", sideA: "唐揚げ", sideB: "フライドチキン" },
  { topic: "コーラ VS ジンジャーエール", sideA: "コーラ", sideB: "ジンジャーエール" },
  { topic: "リンゴ VS バナナ", sideA: "リンゴ", sideB: "バナナ" },
  { topic: "イチゴ VS メロン", sideA: "イチゴ", sideB: "メロン" },
  { topic: "食後のデザート 必要 VS 不要", sideA: "必要", sideB: "不要" },
  { topic: "バイキング VS コース料理", sideA: "バイキング", sideB: "コース料理" },
  { topic: "辛い料理 VS 甘い料理", sideA: "辛い料理", sideB: "甘い料理" },
  { topic: "エビフライ VS アジフライ", sideA: "エビフライ", sideB: "アジフライ" },
  { topic: "カレーは 甘口 VS 辛口", sideA: "甘口", sideB: "辛口" },
  { topic: "すき焼き VS しゃぶしゃぶ", sideA: "すき焼き", sideB: "しゃぶしゃぶ" },
  { topic: "トマトは 生食 VS 加熱調理", sideA: "生食", sideB: "加熱調理" },
  { topic: "パンに塗るなら バター VS ジャム", sideA: "バター", sideB: "ジャム" },
  { topic: "おでんの具 大根 VS 卵", sideA: "大根", sideB: "卵" },
  { topic: "天ぷら塩派 VS 天つゆ派", sideA: "塩派", sideB: "天つゆ派" },
  { topic: "フライドポテト 細切り VS 太切り", sideA: "細切り", sideB: "太切り" },
  { topic: "中華料理 VS イタリアン", sideA: "中華料理", sideB: "イタリアン" },
  { topic: "焼き肉のタレ 醤油ダレ VS 塩ダレ", sideA: "醤油ダレ", sideB: "塩ダレ" },
  { topic: "たい焼き 頭から食べる VS 尻尾から食べる", sideA: "頭から", sideB: "尻尾から" },
  { topic: "餅は 醤油 VS きなこ", sideA: "醤油", sideB: "きなこ" },
  { topic: "かき氷のシロップ いちご VS ブルーハワイ", sideA: "いちご", sideB: "ブルーハワイ" },
  { topic: "お好み焼きは 広島風 VS 関西風", sideA: "広島風", sideB: "関西風" },
  { topic: "焼き鳥 塩 VS タレ", sideA: "塩", sideB: "タレ" },
  { topic: "ソフトクリーム カップ VS コーン", sideA: "カップ", sideB: "コーン" },

  // --- 生活・習慣 ---
  { topic: "朝型 VS 夜型", sideA: "朝型", sideB: "夜型" },
  { topic: "インドア VS アウトドア", sideA: "インドア", sideB: "アウトドア" },
  { topic: "お風呂は シャワー派 VS 湯船派", sideA: "シャワー派", sideB: "湯船派" },
  { topic: "休日の過ごし方 予定を立てる VS 気ままに過ごす", sideA: "予定を立てる", sideB: "気ままに過ごす" },
  { topic: "部屋の掃除 毎日する VS 週末にまとめて", sideA: "毎日する", sideB: "週末まとめて" },
  { topic: "目覚まし時計 一発で起きる VS スヌーズ機能を使う", sideA: "一発で起きる", sideB: "スヌーズ使用" },
  { topic: "傘 ビニール傘 VS 折りたたみ傘", sideA: "ビニール傘", sideB: "折りたたみ傘" },
  { topic: "財布 長財布 VS 二つ折り", sideA: "長財布", sideB: "二つ折り" },
  { topic: "バスタオル 毎日洗う VS 数日使ってから洗う", sideA: "毎日洗う", sideB: "数日使う" },
  { topic: "服を選ぶとき デザイン重視 VS 着心地重視", sideA: "デザイン", sideB: "着心地" },
  { topic: "家での服装 ルームウェア VS 外出着のまま", sideA: "ルームウェア", sideB: "外出着のまま" },
  { topic: "寝具 掛け布団 VS 毛布", sideA: "掛け布団", sideB: "毛布" },
  { topic: "エアコン 冬の暖房は エアコン VS こたつ", sideA: "エアコン", sideB: "こたつ" },
  { topic: "洗顔フォーム 泡タイプ VS 液体タイプ", sideA: "泡タイプ", sideB: "液体タイプ" },
  { topic: "歯磨きのタイミング 食後すぐ VS 寝る直前", sideA: "食後すぐ", sideB: "寝る直前" },
  { topic: "洗濯物は 部屋干し VS 天日干し", sideA: "部屋干し", sideB: "天日干し" },
  { topic: "リュック VS ショルダーバッグ", sideA: "リュック", sideB: "ショルダーバッグ" },
  { topic: "靴 スニーカー VS 革靴・パンプス", sideA: "スニーカー", sideB: "革靴・パンプス" },
  { topic: "テレビ VS YouTube", sideA: "テレビ", sideB: "YouTube" },
  { topic: "日記をつける VS つけない", sideA: "つける", sideB: "つけない" },
  { topic: "買い物は 店舗 VS ネット通販", sideA: "店舗", sideB: "ネット通販" },
  { topic: "荷物は 多い派 VS 少ない派", sideA: "多い派", sideB: "少ない派" },
  { topic: "髪型 ロング VS ショート", sideA: "ロング", sideB: "ショート" },
  { topic: "髪の乾燥 ドライヤー VS 自然乾燥", sideA: "ドライヤー", sideB: "自然乾燥" },
  { topic: "髭剃り カミソリ VS 電気シェーバー", sideA: "カミソリ", sideB: "電気シェーバー" },
  { topic: "身体を洗う ボディソープ VS 固形石鹸", sideA: "ボディソープ", sideB: "固形石鹸" },
  { topic: "香水 つける派 VS つけない派", sideA: "つける派", sideB: "つけない派" },
  { topic: "スケジュール管理 手帳 VS スマホアプリ", sideA: "手帳", sideB: "スマホアプリ" },
  { topic: "メガネ VS コンタクト", sideA: "メガネ", sideB: "コンタクト" },
  { topic: "腕時計 つける派 VS つけない派", sideA: "つける派", sideB: "つけない派" },
  { topic: "家計簿 つける派 VS つけない派", sideA: "つける派", sideB: "つけない派" },
  { topic: "料理は レシピ通り作る VS アレンジする", sideA: "レシピ通り", sideB: "アレンジ" },
  { topic: "外食時の店探し 事前に検索 VS 通りすがりで入る", sideA: "事前に検索", sideB: "通りすがり" },
  { topic: "歩くスピード 早歩き VS ゆっくり", sideA: "早歩き", sideB: "ゆっくり" },
  { topic: "エスカレーター 歩く VS 止まって乗る", sideA: "歩く", sideB: "止まる" },
  { topic: "電車に乗るとき 座りたい VS 立っていてもOK", sideA: "座りたい", sideB: "立っていてもOK" },
  { topic: "車の運転 好き VS 苦手・嫌い", sideA: "好き", sideB: "苦手・嫌い" },
  { topic: "自販機で買う飲み物 冷たい VS 温かい", sideA: "冷たい", sideB: "温かい" },
  { topic: "コンビニに行く頻度 毎日 VS たまに", sideA: "毎日", sideB: "たまに" },
  { topic: "夜寝るときの明るさ 真っ暗 VS 電気をつける", sideA: "真っ暗", sideB: "電気をつける" },
  { topic: "枕の硬さ 柔らかい VS 硬い", sideA: "柔らかい", sideB: "硬い" },
  { topic: "ベッド VS 布団", sideA: "ベッド", sideB: "布団" },
  { topic: "テレビの録画 リアルタイム視聴 VS 録画・配信", sideA: "リアルタイム", sideB: "録画・配信" },
  { topic: "映画を見るなら 映画館 VS 自宅", sideA: "映画館", sideB: "自宅" },
  { topic: "音楽を聴くなら イヤホン VS スピーカー", sideA: "イヤホン", sideB: "スピーカー" },
  { topic: "ゲームは スマホゲーム VS 据え置き型ゲーム", sideA: "スマホ", sideB: "据え置き" },
  { topic: "読書は 紙の本 VS 電子書籍", sideA: "紙の本", sideB: "電子書籍" },
  { topic: "マンガは 1巻ずつ買う VS まとめ買い", sideA: "1巻ずつ", sideB: "まとめ買い" },
  { topic: "ゴミの分別 かなり厳密 VS 大まか", sideA: "厳密", sideB: "大まか" },

  // --- 趣味・娯楽・テクノロジー ---
  { topic: "スマホ Android VS iPhone", sideA: "Android", sideB: "iPhone" },
  { topic: "パソコン Mac VS Windows", sideA: "Mac", sideB: "Windows" },
  { topic: "SNS X（旧Twitter） VS Instagram", sideA: "X", sideB: "Instagram" },
  { topic: "キャッシュレス VS 現金", sideA: "キャッシュレス", sideB: "現金" },
  { topic: "ゲームのジャンル RPG VS アクション", sideA: "RPG", sideB: "アクション" },
  { topic: "音楽ストリーミング VS CD購入", sideA: "ストリーミング", sideB: "CD" },
  { topic: "動画配信サブスク Netflix VS Amazon Prime", sideA: "Netflix", sideB: "Prime Video" },
  { topic: "カラオケ 好き VS 苦手", sideA: "好き", sideB: "苦手" },
  { topic: "遊園地の絶叫マシン 乗りたい VS 絶対無理", sideA: "乗りたい", sideB: "絶対無理" },
  { topic: "お化け屋敷 入れる VS 絶対無理", sideA: "入れる", sideB: "絶対無理" },
  { topic: "キャンプ テント泊 VS グランピング・ホテル", sideA: "テント泊", sideB: "グランピング" },
  { topic: "旅行に行くなら 国内 VS 海外", sideA: "国内", sideB: "海外" },
  { topic: "旅行の計画 ギッシリ詰める VS ゆったりノープラン", sideA: "ギッシリ", sideB: "ノープラン" },
  { topic: "海 VS 山", sideA: "海", sideB: "山" },
  { topic: "夏 VS 冬", sideA: "夏", sideB: "冬" },
  { topic: "春 VS 秋", sideA: "春", sideB: "秋" },
  { topic: "都会派 VS 田舎派", sideA: "都会派", sideB: "田舎派" },
  { topic: "ディズニーリゾート 陸（ランド） VS 海（シー）", sideA: "ランド", sideB: "シー" },
  { topic: "温泉地での過ごし方 湯巡り VS 部屋でゴロゴロ", sideA: "湯巡り", sideB: "部屋でゴロゴロ" },
  { topic: "写真を見るなら スマホ画面 VS プリントアウト", sideA: "スマホ画面", sideB: "プリント" },
  { topic: "イラスト・絵を描く デジタル VS アナログ", sideA: "デジタル", sideB: "アナログ" },
  { topic: "キーボード入力 フリック入力 VS ローマ字入力", sideA: "フリック", sideB: "ローマ字" },
  { topic: "AI技術の発展 期待 VS 不安", sideA: "期待", sideB: "不安" },
  { topic: "自動運転車 乗りたい VS 自分で運転したい", sideA: "自動運転", sideB: "自分運転" },
  { topic: "VR技術 普及する VS 一時的なブーム", sideA: "普及する", sideB: "一時的" },
  { topic: "電気自動車（EV） VS ガソリン車", sideA: "EV", sideB: "ガソリン車" },
  { topic: "スマートウォッチ 使う VS 普通の時計", sideA: "スマートウォッチ", sideB: "普通時計" },
  { topic: "ワイヤレスイヤホン VS 有線イヤホン", sideA: "ワイヤレス", sideB: "有線" },
  { topic: "タブレット端末 必要 VS 不要", sideA: "必要", sideB: "不要" },
  { topic: "ロボット掃除機 導入すべき VS 自分で掃除機", sideA: "ロボット", sideB: "自分でやる" },
  { topic: "電子マネー スマホ決済 VS カードタッチ決済", sideA: "スマホ決済", sideB: "カードタッチ" },
  { topic: "暗号資産（仮想通貨） 投資したい VS 怖くてできない", sideA: "投資したい", sideB: "怖くて無理" },
  { topic: "メタバース（仮想空間） 流行る VS 流行らない", sideA: "流行る", sideB: "流行らない" },
  { topic: "ドローン配送 賛成 VS 反対", sideA: "賛成", sideB: "反対" },
  { topic: "生成AIによる作品 芸術と認める VS 認めない", sideA: "認める", sideB: "認めない" },
  { topic: "宇宙旅行 行ってみたい VS 行きたくない", sideA: "行きたい", sideB: "行きたくない" },
  { topic: "プログラミング学習 必須にすべき VS 任意でいい", sideA: "必須", sideB: "任意" },
  { topic: "ニュースを見る TV・新聞 VS Web・SNS", sideA: "TV・新聞", sideB: "Web・SNS" },
  { topic: "YouTubeコメント欄 読む VS 見ない", sideA: "読む", sideB: "見ない" },
  { topic: "推し活（オタ活） している VS していない", sideA: "している", sideB: "していない" },
  { topic: "ソロ活（一人行動） 平気 VS 寂しい・無理", sideA: "平気", sideB: "無理" },
  { topic: "サウナ・ととのう 好き VS 理解できない", sideA: "好き", sideB: "理解不能" },
  { topic: "筋トレ・ジム 通っている VS 自宅・やらない", sideA: "通っている", sideB: "やらない" },
  { topic: "ランニング VS ウォーキング", sideA: "ランニング", sideB: "ウォーキング" },
  { topic: "スポーツ観戦 現地で観る VS TV・配信で観る", sideA: "現地観戦", sideB: "TV・配信" },
  { topic: "ボードゲーム・卓上ゲーム 好き VS あまりやらない", sideA: "好き", sideB: "やらない" },
  { topic: "プラモデル・工作 好き VS 苦手", sideA: "好き", sideB: "苦手" },
  { topic: "ガーデニング・観葉植物 育てている VS 育てていない", sideA: "育てている", sideB: "育てていない" },
  { topic: "楽器演奏 できる VS できない", sideA: "できる", sideB: "できない" },
  { topic: "料理動画・ASMR 見る VS 見ない", sideA: "見る", sideB: "見ない" },
  // --- 学校・仕事・働き方 ---
  { topic: "就職するなら 大企業 VS 中小企業・ベンチャー", sideA: "大企業", sideB: "ベンチャー" },
  { topic: "働き方 出社 VS リモートワーク", sideA: "出社", sideB: "リモートワーク" },
  { topic: "仕事に求めるのは 高収入 VS やりがい・時間", sideA: "高収入", sideB: "やりがい・時間" },
  { topic: "評価制度 成果主義 VS 年功序列", sideA: "成果主義", sideB: "年功序列" },
  { topic: "副業 推進すべき VS 禁止すべき", sideA: "推進", sideB: "禁止" },
  { topic: "週休3日制 導入賛成 VS 反対", sideA: "賛成", sideB: "反対" },
  { topic: "フリーランス VS 会社員", sideA: "フリーランス", sideB: "会社員" },
  { topic: "残業 してお金を稼ぐ VS 定時で帰る", sideA: "残業して稼ぐ", sideB: "定時帰宅" },
  { topic: "職場の飲み会 参加したい VS 行きたくない", sideA: "参加したい", sideB: "行きたくない" },
  { topic: "上司に求めるのは 頼りになる指導力 VS 優しさ", sideA: "指導力", sideB: "優しさ" },
  { topic: "理系 VS 文系", sideA: "理系", sideB: "文系" },
  { topic: "勉強するなら 独学 VS 塾・スクール", sideA: "独学", sideB: "スクール" },
  { topic: "授業のスタイル 対面授業 VS オンライン授業", sideA: "対面授業", sideB: "オンライン" },
  { topic: "学校の制服 必要 VS 不要（私服化）", sideA: "制服必要", sideB: "私服が良い" },
  { topic: "部活動 全員参加 VS 完全自由参加", sideA: "全員参加", sideB: "自由参加" },
  { topic: "修学旅行 国内 VS 海外", sideA: "国内", sideB: "海外" },
  { topic: "テストの順位 張り出してみんなに見せる VS 非公開", sideA: "公表する", sideB: "非公開" },
  { topic: "給食 VS お弁当", sideA: "給食", sideB: "お弁当" },
  { topic: "学校の掃除 生徒がやる VS 業者がやる", sideA: "生徒がやる", sideB: "業者がやる" },
  { topic: "校則は 厳しいほうがいい VS 自由であるべき", sideA: "厳しい", sideB: "自由" },
  { topic: "宿題・課題 必要 VS 不要", sideA: "必要", sideB: "不要" },
  { topic: "夏休みの宿題 最初に終わらせる VS 最後に焦る", sideA: "最初にやる", sideB: "最後に焦る" },
  { topic: "学歴は 人生において重要 VS 重要ではない", sideA: "重要", sideB: "重要でない" },
  { topic: "大学進学 必須 VS 高卒で働くのもアリ", sideA: "大学進学必須", sideB: "高卒就職アリ" },
  { topic: "資格取得 積極的に取るべき VS 実務経験重視", sideA: "資格重視", sideB: "経験重視" },
  { topic: "転職 キャリアアップで繰り返す VS 一社で長く勤める", sideA: "転職派", sideB: "定着派" },
  { topic: "仕事とプライベート 完全に分ける VS 境界を曖昧にする", sideA: "完全に分ける", sideB: "曖昧でOK" },
  { topic: "会議 対面会議 VS オンライン会議", sideA: "対面会議", sideB: "オンライン会議" },
  { topic: "書類管理 紙 VS ペーパーレス（PDFなど）", sideA: "紙", sideB: "ペーパーレス" },
  { topic: "ビジネスの連絡 メール VS チャットツール（Slack等）", sideA: "メール", sideB: "チャット" },
  { topic: "名刺交換 紙の名刺 VS デジタル名刺", sideA: "紙名刺", sideB: "デジタル名刺" },
  { topic: "起業・独立 してみたい VS リスクが高いから無理", sideA: "起業したい", sideB: "無理" },
  { topic: "転勤命令 受けるべき VS 拒否できるようにすべき", sideA: "受ける", sideB: "拒否権必要" },
  { topic: "定年退職の年齢 引き上げるべき VS 早く定年したい", sideA: "引き上げ", sideB: "早期定年" },
  { topic: "有給休暇 理由を言わずに取る VS 正当な理由が必要", sideA: "理由不要", sideB: "理由必要" },
  { topic: "オフィスの服装 スーツ固定 VS 服装自由", sideA: "スーツ", sideB: "服装自由" },
  { topic: "仕事中の雑談 効率が落ちる VS コミュニケーションに必要", sideA: "効率落ちる", sideB: "必要" },
  { topic: "新人教育 丁寧に教える VS 自分で見て覚えさせる", sideA: "丁寧に教える", sideB: "見て覚える" },
  { topic: "プレゼンテーション 得意 VS 苦手", sideA: "得意", sideB: "苦手" },
  { topic: "リーダーシップ 引っ張るリーダー VS 支えるリーダー", sideA: "引っ張る", sideB: "支える" },
  { topic: "満員電車 耐えられる VS 絶対無理（引っ越す）", sideA: "耐えられる", sideB: "絶対無理" },
  { topic: "職場の人間関係 割り切る VS 仲良くなる", sideA: "割り切る", sideB: "仲良くなる" },
  { topic: "仕事の目標 高く設定する VS 達成可能な目標にする", sideA: "高い目標", sideB: "現実的目標" },
  { topic: "失敗した時の対応 すぐ報告する VS 自力でリカバー試みる", sideA: "すぐ報告", sideB: "自力リカバー" },
  { topic: "仕事のスピード 質より速さ VS 速さより質", sideA: "スピード重視", sideB: "質重視" },
  { topic: "英語学習 全全員やるべき VS 必要な人のみ", sideA: "全員やるべき", sideB: "必要人のみ" },
  { topic: "プログラミング 義務教育化 賛成 VS 反対", sideA: "賛成", sideB: "反対" },
  { topic: "電子黒板 授業で使うべき VS 昔ながらの黒板が良い", sideA: "電子黒板", sideB: "普通の黒板" },
  { topic: "飛び級制度 日本でも導入すべき VS 不要", sideA: "導入すべき", sideB: "不要" },
  { topic: "体育の授業 得意・好き VS 苦手・嫌い", sideA: "好き", sideB: "嫌い" },

  // --- 究極の選択・IF（もしも） ---
  { topic: "お金 VS 愛", sideA: "お金", sideB: "愛" },
  { topic: "タイムマシンで行くなら 過去 VS 未来", sideA: "過去", sideB: "未来" },
  { topic: "無人島に一つ持っていくなら ナイフ VS 万能本", sideA: "ナイフ", sideB: "万能本" },
  { topic: "超能力が得られるなら 瞬間移動 VS タイムトラベル", sideA: "瞬間移動", sideB: "タイムトラベル" },
  { topic: "超能力が得られるなら 読心術（心を読める） VS 透明化", sideA: "読心術", sideB: "透明化" },
  { topic: "魔法が使えるなら 空を飛べる魔法 VS 病気を治す魔法", sideA: "空を飛ぶ", sideB: "病気を治す" },
  { topic: "生まれ変わるなら 男性 VS 女性", sideA: "男性", sideB: "女性" },
  { topic: "生まれ変わるなら 人間 VS 動物", sideA: "人間", sideB: "動物" },
  { topic: "生まれ変わるなら 日本人 VS 外国人", sideA: "日本人", sideB: "外国人" },
  { topic: "一生どちらかしか食べられないなら 肉 VS 魚", sideA: "肉", sideB: "魚" },
  { topic: "一生どちらかしか飲めないなら コーヒー VS お茶", sideA: "コーヒー", sideB: "お茶" },
  { topic: "宝くじで3億円当たったら すぐ使う VS 貯金・投資", sideA: "すぐ使う", sideB: "貯金・投資" },
  { topic: "不老不死になれるなら なりたい VS なりたくない", sideA: "なりたい", sideB: "なりたくない" },
  { topic: "地球最後の日 美味しいものを食べる VS 家族と過ごす", sideA: "美味しいもの", sideB: "家族と過ごす" },
  { topic: "過去のやり直し 人生やり直したい VS 今のままでいい", sideA: "やり直したい", sideB: "今でいい" },
  { topic: "自分の未来がわかる水晶 見たい VS 絶対見たくない", sideA: "見たい", sideB: "見たくない" },
  { topic: "話せるようになるなら 動物と会話 VS 外国人とペラペラ", sideA: "動物と会話", sideB: "外国語ペラペラ" },
  { topic: "住むなら 永遠に夏な国 VS 永遠に冬な国", sideA: "永遠に夏", sideB: "永遠に冬" },
  { topic: "一生一箇所に住む VS 一生旅をして暮らす", sideA: "一箇所定住", sideB: "一生旅" },
  { topic: "有名人・芸能人になりたい VS 一般人が一番", sideA: "有名人になりたい", sideB: "一般人がいい" },
  { topic: "大金持ちだが超孤独 VS 貧乏だが友達がたくさん", sideA: "大金持ち孤独", sideB: "貧乏友達多数" },
  { topic: "過去の記憶を全部消せる薬 飲む VS 飲まない", sideA: "飲む", sideB: "飲まない" },
  { topic: "宇宙人に会えるなら 会ってみたい VS 絶対会いたくない", sideA: "会ってみたい", sideB: "会いたくない" },
  { topic: "自分が天才になれるなら 芸術の天才 VS 科学の天才", sideA: "芸術の天才", sideB: "科学の天才" },
  { topic: "寝なくても平気な体 になれるなら 欲しい VS 不要", sideA: "欲しい", sideB: "不要" },
  { topic: "一生太らない体 欲しい VS 自力でコントロール", sideA: "欲しい", sideB: "自力でやる" },
  { topic: "未来の技術 どこまで進んでほしい？ 完全AI社会 VS 人間味のある社会", sideA: "完全AI社会", sideB: "人間味社会" },
  { topic: "超巨大なロボットを操縦できるなら 乗ってみたい VS 興味ない", sideA: "乗ってみたい", sideB: "興味ない" },
  { topic: "透明人間になれたら 悪用する VS 善行に使う", sideA: "悪用する", sideB: "善行に使う" },
  { topic: "自分のクローンを作れるなら 作りたい VS 作らない", sideA: "作りたい", sideB: "作らない" },
  { topic: "もし神様になれたら 世界を作り変える VS 静観する", sideA: "作り変える", sideB: "静観する" },
  { topic: "どこでもドア VS タケコプター", sideA: "どこでもドア", sideB: "タケコプター" },
  { topic: "デスノートが存在したら 使う VS 破棄する", sideA: "使う", sideB: "破棄する" },
  { topic: "もし自分が歴史上の人物になれるなら 織田信長 VS 坂本龍馬", sideA: "織田信長", sideB: "坂本龍馬" },
  { topic: "もし異世界転生するなら 勇者 VS 魔王", sideA: "勇者", sideB: "魔王" },
  { topic: "自分の寿命を知ることができるなら 知りたい VS 知りたくない", sideA: "知りたい", sideB: "知りたくない" },
  { topic: "人生の目的 成功すること VS 幸せを感じること", sideA: "成功", sideB: "幸せ" },
  { topic: "記憶力が無限になる VS 運動神経が抜群になる", sideA: "記憶力無限", sideB: "運動神経抜群" },
  { topic: "一生暑い服しか着られない VS 一生寒い服しか着られない", sideA: "暑い服", sideB: "寒い服" },
  { topic: "言葉が通じない世界 VS 音がない世界", sideA: "言葉なし", sideB: "音なし" },
  { topic: "一生ネットが使えない VS 一生外に出られない", sideA: "ネット禁止", sideB: "外出禁止" },
  { topic: "過去の自分にメッセージを送れるなら 送る VS 送らない", sideA: "送る", sideB: "送らない" },
  { topic: "願いが一つ叶うなら 自分のため VS 世界のため", sideA: "自分のため", sideB: "世界のため" },
  { topic: "ゾンビパンデミックが起きたら 逃げ回る VS 立ち向かう", sideA: "逃げ回る", sideB: "立ち向かう" },
  { topic: "一瞬で言語をマスターできる薬 1ヶ国語完璧 VS 全言語そこそこ", sideA: "1ヶ国語完璧", sideB: "全言語そこそこ" },
  { topic: "もし宝くじが当たったら 誰かに言う VS 秘密にする", sideA: "言う", sideB: "秘密にする" },
  { topic: "一生ゲームしかできない VS 一生映画しか観られない", sideA: "ゲーム限定", sideB: "映画限定" },
  { topic: "自分の考えが全部相手に伝わる世界 良い VS 嫌だ", sideA: "良い", sideB: "嫌だ" },
  { topic: "一生本しか読めない VS 一生音楽しか聴けない", sideA: "本限定", sideB: "音楽限定" },
  { topic: "人生で大切なのは 挑戦すること VS 守ること", sideA: "挑戦", sideB: "守ること" },

  // --- 社会問題・環境・物議を醸すテーマ ---
  { topic: "消費税率 下げるべき VS 維持・上げるべき", sideA: "下げるべき", sideB: "維持・増税" },
  { topic: "レジ袋有料化 賛成 VS 反対（無料に戻す）", sideA: "賛成", sideB: "反対" },
  { topic: "プラスチック製品の削減 強制的に進めるべき VS 任意でいい", sideA: "強制推進", sideB: "任意" },
  { topic: "ふるさと納税制度 維持すべき VS 廃止すべき", sideA: "維持", sideB: "廃止" },
  { topic: "ベーシックインカム（全市民にお金を給付） 導入すべき VS 反対", sideA: "導入すべき", sideB: "反対" },
  { topic: "キャッシュレス完全化（現金廃止） 賛成 VS 反対", sideA: "賛成", sideB: "反対" },
  { topic: "選挙の投票 義務化すべき VS 自由であるべき", sideA: "義務化", sideB: "自由" },
  { topic: "選挙権年齢 18歳から VS 16歳に引き下げるべき", sideA: "18歳のまま", sideB: "16歳へ引き下げ" },
  { topic: "夫婦別姓制度 導入すべき VS 現行通り（同姓）", sideA: "別姓導入", sideB: "同姓維持" },
  { topic: "同性婚の法制化 認めるべき VS 認めるべきではない", sideA: "認めるべき", sideB: "反対" },
  { topic: "安楽死・尊厳死 認めるべき VS 認めるべきではない", sideA: "認めるべき", sideB: "反対" },
  { topic: "タバコ 屋内全面禁煙にすべき VS 分煙スペースを作るべき", sideA: "全面禁煙", sideB: "分煙容認" },
  { topic: "歩きスマホの罰則化 導入すべき VS 罰則までは不要", sideA: "罰則化すべき", sideB: "罰則不要" },
  { topic: "ペットの販売（ペットショップ） 規制強化すべき VS 現状維持", sideA: "規制強化", sideB: "現状維持" },
  { topic: "動物園・水族館 存続すべき VS 廃止していくべき", sideA: "存続", sideB: "廃止へ" },
  { topic: "フードロス対策 企業に罰則を設けるべき VS 自主性に任せる", sideA: "罰則化", sideB: "自主性" },
  { topic: "食品ロスを減らす賞味期限表示 緩和すべき VS 現状維持", sideA: "緩和すべき", sideB: "現状維持" },
  { topic: "救急車の有料化（軽症者対策） 導入すべき VS 無料維持", sideA: "有料化すべき", sideB: "無料維持" },
  { topic: "自転車のヘルメット着用 義務化・罰則化すべき VS 努力義務でいい", sideA: "義務化・罰則", sideB: "努力義務" },
  { topic: "成人年齢 18歳 VS 20歳に戻すべき", sideA: "18歳維持", sideB: "20歳に戻す" },
  { topic: "原子力発電 依存度を減らす・廃止 VS 活用していく", sideA: "脱原発", sideB: "原発活用" },
  { topic: "再生可能エネルギー 優先的に拡大すべき VS コスト面を重視すべき", sideA: "再エネ優先", sideB: "コスト重視" },
  { topic: "遺伝子組み換え食品 規制を強めるべき VS 普及させるべき", sideA: "規制強化", sideB: "普及容認" },
  { topic: "AIによる裁判・判決 導入すべき VS 人間の裁判官が行うべき", sideA: "AI裁判導入", sideB: "人間裁判官" },
  { topic: "防犯カメラの設置数を増やす 賛成（防犯優先） VS 反対（プライバシー優先）", sideA: "防犯優先", sideB: "プライバシー優先" },
  { topic: "マイナンバーカード 一本化推進 VS 任意取得に戻す", sideA: "一本化推進", sideB: "任意取得" },
  { topic: "外国人労働者の受け入れ 拡大すべき VS 慎重にするべき", sideA: "拡大", sideB: "慎重" },
  { topic: "日本の観光地 オーバーツーリズム対策 規制を強めるべき VS 観光客優先", sideA: "規制強化", sideB: "観光優先" },
  { topic: "NHK受信料 義務化維持 VS 払い込んだ人のみ視聴（スクランブル化）", sideA: "義務維持", sideB: "スクランブル化" },
  { topic: "少年法の適用年齢 下げるべき VS 現状維持", sideA: "下げるべき", sideB: "現状維持" },
  { topic: "死刑制度 維持すべき VS 廃止すべき", sideA: "維持", sideB: "廃止" },
  { topic: "裁判員制度 続けるべき VS 廃止すべき", sideA: "継続", sideB: "廃止" },
  { topic: "女性専用車両 必要 VS 不要（差別的）", sideA: "必要", sideB: "不要" },
  { topic: "サマータイム（夏時間） 導入すべき VS 不要", sideA: "導入すべき", sideB: "不要" },
  { topic: "祝日を増やすべき VS 現状で十分", sideA: "増やすべき", sideB: "現状維持" },
  { topic: "定額減税・給付金 給付金が効果的 VS 減税が効果的", sideA: "給付金", sideB: "減税" },
  { topic: "最低賃金 大幅に引き上げるべき VS 企業への影響を考慮して抑えるべき", sideA: "大幅引き上げ", sideB: "抑制すべき" },
  { topic: "公共交通機関の無人運転化 推進すべき VS 人間の運転手を残すべき", sideA: "無人化推進", sideB: "運転手を残す" },
  { topic: "メタバース・AI空間での著作権 厳しく取り締まるべき VS 自由度を優先", sideA: "厳密取締", sideB: "自由度優先" },
  { topic: "宇宙ゴミ（デブリ）対策 国際的な資金を投入すべき VS 開発優先", sideA: "対策優先", sideB: "開発優先" },
  { topic: "遺伝子編集技術 人間への応用を認めるべき VS 倫理的に禁止すべき", sideA: "応用認める", sideB: "倫理的禁止" },
  { topic: "動物実験 全面禁止すべき VS 医療発展のために必要", sideA: "全面禁止", sideB: "医療上必要" },
  { topic: "海洋プラスチックごみ 罰則付きで投棄規制 VS 啓発活動重視", sideA: "罰則付き規制", sideB: "啓発重視" },
  { topic: "森林伐採の規制 住宅開発より環境保全 VS 開発優先", sideA: "環境保全優先", sideB: "開発優先" },
  { topic: "絶滅危惧種の保護 莫大な予算を使うべき VS 人間の生活支援優先", sideA: "保護優先", sideB: "人間生活優先" },
  { topic: "文化財・歴史的建造物の維持 税金を投入すべき VS クラウドファンディング・民間", sideA: "税金投入", sideB: "民間・CF" },
  { topic: "スポーツ大会でのAI審判 完全移行すべき VS 人間の審判を残すべき", sideA: "AI完全移行", sideB: "人間審判存続" },
  { topic: "eスポーツ（ゲーム対戦） 体育・スポーツと認めるべき VS 娯楽にすぎない", sideA: "スポーツと認める", sideB: "娯楽にすぎない" },
  { topic: "表現の自由 VS ネット上のヘイトスピーチ規制", sideA: "表現の自由優先", sideB: "規制優先" },
  { topic: "世界平和のために必要なのは 強い軍事力（抑止力） VS 外交と対話", sideA: "軍事・抑止力", sideB: "外交・対話" }
];

// サーバー起動チェック用
app.get('/', (req, res) => {
  res.send(`Yururon Game Server is Running! (${THEMES.length} themes available)`);
});

// マッチングAPI
app.get('/match', (req, res) => {
  const username = req.query.username || '名無し';
  const userId = req.query.userId || `guest_${Date.now()}`;

  // 1. すでに自分が待ち状態なら古い待機をリセット
  if (waitingPlayer && (waitingPlayer.userId === userId || waitingPlayer.username === username)) {
    waitingPlayer = null;
  }

  // 2. 他の待機プレイヤーがいる場合 ➔ マッチング成立
  if (waitingPlayer) {
    const roomName = 'room_' + Date.now();
    const selectedTheme = THEMES[Math.floor(Math.random() * THEMES.length)];

    rooms[roomName] = {
      theme: selectedTheme.topic,
      sideA: selectedTheme.sideA,
      sideB: selectedTheme.sideB,
      players: [waitingPlayer.username, username],
      messages: [],
      hpData: { [waitingPlayer.username]: 2000, [username]: 2000 },
      isGameOver: false
    };

    const opponent = waitingPlayer;
    waitingPlayer = null; // 待機枠をクリア

    // 1人目（待っていた人）＝ 前者(sideA)
    opponent.res.send(`MATCHING_SUCCESS | Room: ${roomName} | ${selectedTheme.topic} | YOUR_SIDE: ${selectedTheme.sideA}`);
    
    // 2人目（今来た人）＝ 後者(sideB)
    res.send(`MATCHING_SUCCESS | Room: ${roomName} | ${selectedTheme.topic} | YOUR_SIDE: ${selectedTheme.sideB}`);

  } else {
    // 3. 誰も待っていない場合 ➔ 自分が待機プレイヤーになる
    waitingPlayer = { username, userId, res };

    // 25秒のタイムアウト対策
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

// メッセージ送信API
app.post('/send-message', (req, res) => {
  const { roomName, sender, text, hp } = req.body;
  const room = rooms[roomName];

  if (!room || room.isGameOver) {
    return res.status(404).json({ error: 'Room not found or game over' });
  }

  if (text && text.trim() !== "") {
    room.messages.push({ sender, text });
    if (hp !== undefined) {
      room.hpData[sender] = hp;
    }
  }

  res.json({ status: 'ok', hpData: room.hpData, messages: room.messages });
});

// メッセージ＆HP取得API
app.get('/get-messages', (req, res) => {
  const { roomName } = req.query;
  const room = rooms[roomName];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ messages: room.messages, hpData: room.hpData });
});

// ゲームオーバーAPI
app.post('/game-over', (req, res) => {
  const { roomName } = req.body;
  if (rooms[roomName]) {
    delete rooms[roomName];
  }
  res.json({ status: 'cleaned' });
});

// スコア保存API
app.post('/update-score', (req, res) => {
  const { userId, name, level, exp, label } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  playerRankings[userId] = {
    name: name || '名無し',
    level: parseInt(level) || 1,
    exp: parseInt(exp) || 0,
    label: label || '一般人',
    updatedAt: Date.now()
  };
  res.json({ status: 'success' });
});

// ランキングAPI
app.get('/ranking', (req, res) => {
  let sortedList = Object.keys(playerRankings).map(id => ({
    id: id,
    ...playerRankings[id]
  })).sort((a, b) => b.level !== a.level ? b.level - a.level : b.exp - a.exp);

  if (sortedList.length === 0) {
    return res.send("[殿堂入り レベルランキング]\n\n現在ランキングデータはありません。");
  }

  let text = "[殿堂入り レベルランキング TOP10]\n\n";
  sortedList.slice(0, 10).forEach((player, index) => {
    const displayId = player.id.length > 12 ? player.id.substring(0, 10) + "..." : player.id;
    text += `${index + 1}位 : ${player.name} (ID: ${displayId})\n`;
    text += `       └ Lv.${player.level} [${player.label}]\n\n`;
  });

  res.send(text);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
