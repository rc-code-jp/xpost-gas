# Cursor Rules 生成レポート

## プロジェクト概要
**xpost-gas** - X(Twitter) OAuth 2.0自動ポストBot（Google Apps Script）

### 技術スタック
- **メイン言語**: TypeScript 5.3.3
- **実行環境**: Google Apps Script V8
- **開発ツール**: CLASP（Google Apps Script CLI）
- **API**: X(Twitter) API v2 + OAuth 2.0 PKCE
- **データ管理**: Google スプレッドシート
- **デプロイメント**: NPMスクリプト + VS Code統合

## 生成されたルール体系

### 📁 ディレクトリ構造
```
.cursor/rules/
├── core/                    # 横断的ルール
│   ├── coding-style.mdc     # TypeScript + GAS コーディングスタイル
│   └── project-structure.mdc # プロジェクト構造とファイル組織
├── backend/                 # バックエンド技術ルール
│   ├── gas-development.mdc  # Google Apps Script開発ルール
│   └── oauth-security.mdc   # OAuth 2.0セキュリティルール
├── quality/                 # 品質管理ルール
│   └── testing.mdc         # テストとコード品質
└── deployment/             # デプロイメントルール
    └── gas-deployment.mdc  # GASデプロイメント手順
```

## ルールカテゴリ別詳細

### 🎯 Core（コア）- 2ルール

#### coding-style.mdc
- **対象**: TypeScript + Google Apps Script環境
- **重点領域**: 命名規則、型定義、エラーハンドリング、JSDoc
- **特徴**: 日本語コメント推奨、GAS固有制約対応

#### project-structure.mdc  
- **対象**: プロジェクト全体の組織化
- **重点領域**: ディレクトリ構造、ファイル命名、責務分離
- **特徴**: CLASP構成、設定ファイル管理

### 🚀 Backend（バックエンド）- 2ルール

#### gas-development.mdc
- **対象**: Google Apps Script開発特有の制約と最適化
- **重点領域**: GAS API使用、スプレッドシート操作、実行時間制限対策
- **特徴**: 6分制限対策、バッチ処理、プロパティサービス活用

#### oauth-security.mdc
- **対象**: OAuth 2.0 + PKCE認証のセキュリティ
- **重点領域**: 認証フロー、トークン管理、セキュリティ保護
- **特徴**: CSRF対策、トークンリフレッシュ、秘密情報管理

### ✅ Quality（品質）- 1ルール

#### testing.mdc
- **対象**: GAS環境でのテスト手法とデバッグ
- **重点領域**: Logger活用、モックテスト、コード品質チェック
- **特徴**: 手動テスト重視、実本番環境での慎重なテスト

### 🚢 Deployment（デプロイメント）- 1ルール

#### gas-deployment.mdc
- **対象**: CLASP + NPM + VS Code統合デプロイメント
- **重点領域**: 自動化スクリプト、バージョン管理、トラブルシューティング
- **特徴**: 段階的デプロイ、緊急時対応、Git連携

## プロジェクト固有の適応

### 🎯 X(Twitter) API特化
- OAuth 2.0 + PKCE認証パターン
- API制限対応（レート制限、バッチ処理）
- 複数アカウント管理

### 🏗️ Google Apps Script最適化
- 実行時間制限（6分）対策
- スプレッドシート効率操作
- PropertiesService活用

### 🔒 セキュリティ重視
- 秘密情報のハードコーディング禁止
- 適切な認証フロー実装
- CSRF/XSS対策

### 🛠️ 開発体験向上
- VS Code統合（タスク、ショートカット）
- NPMスクリプト標準化
- 自動化されたビルド・デプロイ

## 使用方法

### 基本的な開発フロー
1. **コード作成**: `src/` 配下でTypeScript開発
2. **ビルド・デプロイ**: `npm run deploy` または Ctrl+Shift+B
3. **テスト**: GASエディタでテスト関数実行
4. **デバッグ**: `npm run logs` でログ確認

### Cursorエディタでの活用
- `.mdc` ルールが自動適用
- コンテキストに応じた適切な指導
- プロジェクト固有のベストプラクティス遵守

## 推奨アクション

### 開発チーム向け
1. **ルール確認**: 各 `.mdc` ファイルの内容を一読
2. **ツール設定**: VS Code タスクとショートカット活用
3. **テスト実行**: 定期的な品質チェック実施

### 新規メンバー向け
1. **README.md**: プロジェクト概要と手順理解
2. **Core ルール**: 基本的なコーディング規則習得  
3. **実践練習**: 小さな機能追加での慣れ

## 今後の拡張可能性

### 追加検討事項
- エラー監視とアラート設定
- 自動テスト実行環境の構築
- 本番環境とテスト環境の分離
- パフォーマンス監視ダッシュボード

---

**総ルールファイル数**: 6個  
**対象ファイルパターン**: TypeScript、設定ファイル、プロジェクト全体  
**優先度**: High（コア・セキュリティ）、Medium（デプロイ・品質）

✅ **Cursor Rules 生成完了** - レビューして適用準備完了 