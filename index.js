const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// ミドルウェア設定
app.use(bodyParser.json());
app.use(cors());

// インメモリデータストア（実際のアプリではデータベースを使用）
const users = {};

// サーバー起動時にテスト用アカウントを作成
users["TaroYamada"] = {
  user_id: "TaroYamada",
  password: "PaSSwd4TY",
  nickname: "たろー",
  comment: "僕は元気です"
};

// Basic認証ミドルウェア（そのままでOK）
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [userId, password] = credentials.split(':');
    if (!users[userId] || users[userId].password !== password) {
      return res.status(401).json({ message: "Authentication failed" });
    }
    req.user = { userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
}

// エンドポイント1: POST /signup - アカウント作成
app.post('/signup', (req, res) => {
  const { user_id, password } = req.body;
  
  // バリデーション
  if (!user_id || !password) {
    return res.status(400).json({ 
      message: "Account creation failed", 
      cause: "Required user_id and password" 
    });
  }
  
  // user_idの検証（6文字以上20文字以内の半角英数字）
  if (!/^[a-zA-Z0-9]{6,20}$/.test(user_id)) {
    return res.status(400).json({ 
      message: "Account creation failed", 
      cause: "Input length is incorrect" 
    });
  }
  
  // passwordの検証（8文字以上20文字以内の半角英数記号）
  if (!/^[\x21-\x7E]{8,20}$/.test(password) || /[\s]/.test(password)) {
    return res.status(400).json({ 
      message: "Account creation failed", 
      cause: "Incorrect character pattern" 
    });
  }
  
  // 既存ユーザーチェック
  if (users[user_id]) {
    return res.status(400).json({ 
      message: "Account creation failed", 
      cause: "Already same user_id is used" 
    });
  }
  
  // ユーザー作成
  users[user_id] = {
    user_id,
    password,
    nickname: user_id,
    comment: ""
  };
  
  // 成功レスポンス
  res.status(200).json({
    message: "Account successfully created",
    user: {
      user_id,
      nickname: user_id
    }
  });
});

// エンドポイント2: GET /users/{user_id} - ユーザー情報取得
app.get('/users/:user_id', authenticateUser, (req, res) => {
  const { user_id } = req.params;
  // ユーザー存在チェック
  if (!users[user_id]) {
    return res.status(404).json({ message: "No user found" });
  }
  // 認証ユーザーと一致するか確認
  if (req.user.userId !== user_id) {
    return res.status(403).json({ message: "No permission for access" });
  }
  // ユーザー情報を返す
  res.status(200).json({
    message: "User details by user_id",
    user: {
      user_id: users[user_id].user_id,
      nickname: users[user_id].nickname,
      comment: users[user_id].comment
    }
  });
});

// エンドポイント3: PATCH /users/{user_id} - ユーザー情報更新
app.patch('/users/:user_id', authenticateUser, (req, res) => {
  const { user_id } = req.params;
  const { nickname, comment } = req.body;
  
  // まず認証ユーザーと一致するか確認
  if (req.user.userId !== user_id) {
    return res.status(403).json({ message: "No permission for update" });
  }
  
  // その後、ユーザー存在チェック
  if (!users[user_id]) {
    return res.status(404).json({ message: "No user found" });
  }
  
  // user_idやpasswordの更新禁止
  if (req.body.user_id !== undefined || req.body.password !== undefined) {
    return res.status(400).json({
      message: "User update failed",
      cause: "Not updatable user_id and password"
    });
  }
  
  // nicknameとcommentどちらも指定されていない場合
  if (nickname === undefined && comment === undefined) {
    return res.status(400).json({
      message: "User update failed",
      cause: "Required nickname or comment"
    });
  }
  
  // nicknameの検証（指定された場合）
  if (nickname !== undefined) {
    if (nickname.length > 30 || /[\x00-\x1F\x7F]/.test(nickname)) {
      return res.status(400).json({
        message: "User update failed",
        cause: "Invalid nickname or comment"
      });
    }
    users[user_id].nickname = nickname || user_id;
  }
  
  // commentの検証（指定された場合）
  if (comment !== undefined) {
    if (comment.length > 100 || /[\x00-\x1F\x7F]/.test(comment)) {
      return res.status(400).json({
        message: "User update failed",
        cause: "Invalid nickname or comment"
      });
    }
    users[user_id].comment = comment || "";
  }
  
  // 成功レスポンス
  res.status(200).json({
    message: "User successfully updated",
    user: [{
      nickname: users[user_id].nickname,
      comment: users[user_id].comment
    }]
  });
});

// エンドポイント4: POST /close - アカウント削除
app.post('/close', authenticateUser, (req, res) => {
  const userId = req.user.userId;
  
  // ユーザー削除
  delete users[userId];
  
  // 成功レスポンス
  res.status(200).json({
    message: "Account and user successfully removed"
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.status(200).send('Account Authentication API Server');
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});