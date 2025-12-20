# Contributing to ヒルヨル

ヒルヨルプロジェクトへのコントリビューションを歓迎します！

## 開発環境のセットアップ

### 前提条件
- Node.js 18+
- pnpm
- Expo CLI
- MySQL (TiDB)

### インストール
```bash
# リポジトリをクローン
git clone https://github.com/Haruki-0703/Hiruyoru.git
cd Hiruyoru

# 依存関係をインストール
pnpm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要なAPIキーを設定

# データベースのセットアップ
pnpm db:push
```

### 開発サーバーの起動
```bash
# サーバーとクライアントを同時に起動
pnpm dev
```

## 開発ワークフロー

### ブランチ戦略
- `main`: 安定版ブランチ
- `v{major}.{minor}`: バージョン別開発ブランチ
- `feature/*`: 新機能開発
- `fix/*`: バグ修正
- `docs/*`: ドキュメント更新

### コミットメッセージ
[Conventional Commits](https://conventionalcommits.org/)形式を使用：

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### プルリクエスト
1. 機能ブランチを作成
2. 変更を実装
3. テストを実行（`pnpm test`）
4. コード品質チェック（`pnpm lint`）
5. ビルド確認（`pnpm build`）
6. プルリクエストを作成

## テスト

### テスト実行
```bash
# 全テスト実行
pnpm test

# カバレッジレポート付き
pnpm test:coverage

# E2Eテスト
npx detox test
```

### テスト作成ガイドライン
- 単体テスト: `tests/unit.test.ts`
- 統合テスト: `tests/integration.test.ts`
- E2Eテスト: `e2e/` ディレクトリ
- 受け入れテスト: `tests/acceptance.test.ts`

## コード品質

### ESLint
```bash
pnpm lint
```

### TypeScript
```bash
pnpm check
```

### Prettier
```bash
pnpm format
```

## API設計

### tRPCルーター
- `server/routers/`: APIエンドポイント定義
- 入力バリデーション: Zodスキーマ使用
- エラーハンドリング: 適切なHTTPステータスコード

### データベース
- Drizzle ORM使用
- マイグレーション: `pnpm db:push`
- スキーマ定義: `drizzle/schema.ts`

## セキュリティ

### APIキー管理
- 環境変数を使用（`.env`ファイル）
- コミット前に`.env`ファイルの確認

### 脆弱性チェック
```bash
pnpm audit
```

## リリース

### バージョン管理
- Semantic Versioning (v{major}.{minor}.{patch})
- CHANGELOG.mdで変更履歴を管理
- Gitタグでバージョン管理

### リリース手順
1. バージョン番号を更新（`package.json`）
2. CHANGELOG.mdを更新
3. コミットとタグ作成
4. GitHubリリース作成

## サポート

質問や問題がある場合は、GitHub Issuesをご利用ください。