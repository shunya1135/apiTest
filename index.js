const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// ミドルウェア設定
app.use(bodyParser.json());
app.use(cors());

// インメモリデータストア
const users = {};

// サーバー起動時にテスト用アカウントを作成（適切なパスワードに修正）
users["TaroYamada"] = {
  user_id: "TaroYamada",
  password: "PaSSwd4TY",
  nickname: "たろー",
  comment: "僕は元気です"
};

// ルートエンドポイント - 迅速に応答するよう明示的に設定
app.get('/', (req, res) => {
  res.status(404).send('Account Authentication API Server');
});

// POST /signup - アカウント作成
app.post('/signup', (req, res) => {
  const { user_id, password } = req.body;
  
  // バリデーション
  if (!user_id || !password) {
    return res.status(400).json({ 
      message: "Account creation failed", 
      cause: "Required user_id and password" 
    });
  }
  
  // user_idの検証（ハイフン対応）
  if (!/^[a-zA-Z0-9-]{6,20}$/.test(user_id)) {
    return res.status(400).json({ 
      message: "Account creation failed", 
      cause: "Input length is incorrect" 
    });
  }
  
  // passwordの検証
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

// GET /users/{user_id} - ユーザー情報取得
app.get('/users/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  // 認証処理
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [authUserId, authPassword] = credentials.split(':');
    
    // 認証情報の検証
    if (!users[authUserId] || users[authUserId].password !== authPassword) {
      return res.status(401).json({ message: "Authentication failed" });
    }
    
    // ユーザー存在チェック
    if (!users[user_id]) {
      return res.status(404).json({ message: "No user found" });
    }
    
    // 重要：他のユーザー情報も取得可能
    
    // ユーザー情報を返す
    res.status(200).json({
      message: "User details by user_id",
      user: {
        user_id: users[user_id].user_id,
        nickname: users[user_id].nickname,
        comment: users[user_id].comment
      }
    });
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
});

// PATCH /users/{user_id} - ユーザー情報更新
app.patch('/users/:user_id', (req, res) => {
  const { user_id } = req.params;
  const { nickname, comment } = req.body;
  
  // 認証処理
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [authUserId, authPassword] = credentials.split(':');
    
    // 認証情報の検証
    if (!users[authUserId] || users[authUserId].password !== authPassword) {
      return res.status(401).json({ message: "Authentication failed" });
    }
    
    // まず認証ユーザーと一致するか確認
    if (authUserId !== user_id) {
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
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
});

// POST /close - アカウント削除
app.post('/close', (req, res) => {
  // 認証処理
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [userId, password] = credentials.split(':');
    
    // 認証情報の検証
    if (!users[userId] || users[userId].password !== password) {
      return res.status(401).json({ message: "Authentication failed" });
    }
    
    // ユーザー削除
    delete users[userId];
    
    // 成功レスポンス
    res.status(200).json({
      message: "Account and user successfully removed"
    });
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});