# X(Twitter) 自動ポストBot（OAuth 2.0対応）

## 概要
Google Apps Script（GAS）を使用したX(Twitter)自動ポストシステムです。OAuth 2.0 + PKCE認証による安全な認証と、スプレッドシートからのランダムツイート投稿機能を提供します。

## 主な機能

### 🔐 セキュリティ機能
- **OAuth 2.0 + PKCE認証**: 最新のセキュリティ標準に対応
- **自動トークン更新**: リフレッシュトークンによる継続的なアクセス
- **複数アカウント対応**: 複数のTwitterアカウントを管理
- **安全なトークン管理**: スプレッドシートによる暗号化された保存

### 📊 ポスト機能
- **ランダムポスト**: 「ポスト」シートからランダムに内容を選択
- **複数アカウント**: 登録された複数アカウントからランダム選択
- **定期実行**: トリガーによる自動ポスト
- **手動実行**: 特定ユーザーでの手動ポスト

## セットアップ手順

### 1. Twitter Developer Portal設定

#### アプリケーション作成
1. [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) にアクセス
2. 新しいアプリケーションを作成
3. OAuth 2.0設定で以下を設定：
   - **Type of App**: Web App
   - **Callback URLs**: `https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback`
   - **Website URL**: あなたのWebサイトまたは適当なURL

#### 必要な権限
- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

### 2. プロジェクトのデプロイ

```bash
# 依存関係インストール
npm install

# Google Apps Scriptログイン
npx clasp login

# プロジェクトをプッシュ
npx clasp push
```

## 🚀 開発用NPMスクリプト

### 基本コマンド
```bash
# ビルド + デプロイ（一番よく使う）
npm run deploy

# 開発モード（deployのエイリアス）
npm run dev

# ビルドのみ
npm run build

# プッシュのみ
npm run push
```

### 便利なコマンド
```bash
# ログイン
npm run login

# プロジェクト状態確認
npm run status

# デプロイ情報確認
npm run info

# GASエディタを開く
npm run open

# ログ確認
npm run logs

# ファイル削除 + 再デプロイ
npm run reset

# ファイル変更監視（開発時）
npm run watch
```

### 🎯 VS Code ユーザー向け

**Ctrl+Shift+P** (macOS: **Cmd+Shift+P**) でコマンドパレットを開き、「Tasks: Run Task」を選択：

- **GAS: Build & Deploy** - ビルド＋デプロイ（**Ctrl+Shift+B**でも実行可能）
- **GAS: Build Only** - ビルドのみ
- **GAS: Push Only** - プッシュのみ  
- **GAS: Open Editor** - GASエディタを開く
- **GAS: Check Status** - プロジェクト状態確認

**便利なショートカット：**
- **Ctrl+Shift+B** (macOS: **Cmd+Shift+B**): ビルド＋デプロイを実行

### 3. Google Apps Script設定

#### プロパティサービス設定
1. GASエディタで「プロパティサービス」を開く
2. 以下のプロパティを設定：
   ```
   TWITTER_CLIENT_ID: your_twitter_client_id
   TWITTER_CLIENT_SECRET: your_twitter_client_secret
   SPREADSHEET_ID: your_spreadsheet_id
   ```

#### Webアプリとしてデプロイ
1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類：ウェブアプリ
3. 次のユーザーとして実行：自分
4. アクセス権限：全員

### 4. スプレッドシート設定

#### 必要なシート

##### 認証情報シート
| user_id | user_name | token | refresh_token |
|---------|-----------|-------|---------------|
| ユーザーID | ユーザー名 | アクセストークン | リフレッシュトークン |

##### ポストシート
| post_content |
|--------------|
| こんにちは！今日も一日頑張ります 💪 |
| プログラミングって楽しいですね！ #coding |
| お疲れ様でした！今日も良い一日でした ✨ |
| 新しいことを学ぶのは素晴らしいです 📚 |
| みなさんも良い一日をお過ごしください 🌟 |

### 5. 使用方法

#### 初回認証
1. WebアプリのURLにアクセス
2. 「Twitter認証を開始」ボタンをクリック
3. Twitterで認証を完了

#### ポスト実行

##### ランダムポスト（複数アカウント対応）
```javascript
postRandomTweet();
```

##### 特定ユーザーでポスト
```javascript
postTweetForSpecificUser('user_id');
```

##### カスタムテキストでポスト
```javascript
postTweetForSpecificUser('user_id', '今日は素晴らしい日です！');
```

#### 定期実行設定
1. GASエディタで「トリガー」を開く
2. 新しいトリガーを作成：
   - 実行する関数: `scheduledTweet`
   - イベントのソース: 時間主導型
   - 時間の間隔: 希望する間隔（例：1時間ごと）

## API仕様

### 主要関数

#### startOAuthAuthentication()
OAuth 2.0認証を開始し、認証URLを生成

#### completeOAuthAuthentication(authCode, state)
認証コードを使用してアクセストークンを取得し、スプレッドシートに保存

#### postRandomTweet()
ランダムなユーザーとポスト内容でツイートを投稿

#### postTweetForSpecificUser(userId, customText?)
特定ユーザーでツイートを投稿（カスタムテキスト対応）

#### validateAndRefreshAllTokens()
全ユーザーのトークンを検証し、必要に応じて更新

## セキュリティ特徴

### OAuth 2.0の利点
- **PKCE対応**: Authorization Code Injection攻撃を防止
- **短時間アクセストークン**: セキュリティリスクを最小化
- **リフレッシュトークン**: 長期間の安全なアクセス
- **スコープ制御**: 必要最小限の権限のみ要求

### データ保護
- **暗号化保存**: Google Sheetsの暗号化による安全な保存
- **アクセス制御**: GASの実行権限による制御
- **ログ管理**: 詳細なログによるアクセス監視

## トラブルシューティング

### よくある問題

#### 認証エラー
- Callback URLがTwitter Portalと一致しているか確認
- Client IDとSecretが正しく設定されているか確認

#### トークンエラー
- `validateAndRefreshAllTokens()`を実行してトークンを更新
- 必要に応じて再認証を実行

#### ポスト失敗
- スプレッドシートにポスト内容が設定されているか確認
- Twitter APIの利用制限に達していないか確認

### ログ確認
```javascript
// テスト関数を実行してログを確認
testFunction();
```

## プロジェクト構成

```
├── src/
│   ├── Code.ts              # メインエントリーポイント
│   ├── OAuth.ts             # OAuth 2.0認証処理
│   ├── XPoster.ts           # X(Twitter)ポスト機能
│   ├── SpreadsheetManager.ts # スプレッドシート管理
│   └── global.d.ts          # 型定義
├── dist/                    # コンパイル済みファイル
├── package.json             # プロジェクト設定
├── tsconfig.json           # TypeScript設定
├── .clasp.json             # clasp設定
└── README.md               # このファイル
```

## 更新履歴

### v2.0.0 (2024-01-XX)
- OAuth 2.0 + PKCE対応
- セキュリティ機能強化
- 自動トークン更新機能
- UI/UX改善

### v1.0.0 (2024-01-XX)
- 初期リリース
- OAuth 1.0a対応（廃止）

## ライセンス
MIT License

## 注意事項
- Twitter APIの利用規約を遵守してください
- 適切な投稿頻度を設定してください（スパム防止）
- 個人情報の取り扱いに注意してください 