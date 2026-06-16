# Ok Obsidian Plugin Image

Languages: [English](#english) | [简体中文](#简体中文) | [繁體中文](#繁體中文) | [한국어](#한국어) | [日本語](#日本語)

## English

An Obsidian plugin that uploads pasted and embedded images to a remote GitHub repository.

### Features

- Upload pasted image files before inserting the final Markdown image link.
- Upload image links in the current note on save or by command.
- Upload the image under the cursor or current selection from the editor context menu.
- Replace image links in place only after upload succeeds.
- Optionally delete original local vault images after successful upload and replacement.
- Generate public URLs with GitHub raw URLs or a custom domain/CDN.
- Optional private repository URL mode that embeds the token into raw GitHub image URLs.
- Configurable upload concurrency and log level.
- Short-lived in-memory hash cache reuses recently uploaded image URLs and skips duplicate uploads.
- Uploaded image paths use `document-name/original-image-name-random.ext`.
- UI languages: Simplified Chinese, Traditional Chinese, English, Korean, Japanese.

### Configuration

Open Obsidian settings, find **Ok Obsidian Plugin Image**, then configure:

- GitHub repository short path: `owner/repo`
- Branch, for example `main`
- Personal Access Token with `contents:write` access to the repository
- Optional custom domain or CDN, for example `https://img.example.com`
- Upload concurrency
- Log level

Uploaded images are stored under a sanitized current-document folder. For example, pasting `screenshot.png` into `My Note.md` creates a path like:

```text
My-Note/screenshot-a1b2c3d4e5.png
```

### Private Repositories

Markdown image requests cannot attach an `Authorization` header. When private image URL mode is enabled, generated URLs use `x-access-token` basic-auth style raw GitHub URLs. This may expose the token anywhere the note is visible.

Custom domains and third-party CDNs generally cannot use the GitHub token automatically, so private repository images may not work through a custom domain.

### Development

```bash
npm install
npm run dev
npm run build
```

For manual testing, copy or symlink this repository into:

```text
<vault>/.obsidian/plugins/ok-obsidian-plugin-image
```

Runtime files:

- `manifest.json`
- `main.js`
- `styles.css`

### Release Flow

This project uses Changesets and GitHub Actions.

- New commits on `main` with changesets create or update a version PR.
- Merging the version PR updates version files and changelog.
- After merge, the release workflow builds the plugin, creates a tag, creates a GitHub Release, and uploads `main.js`, `manifest.json`, and `styles.css`.

## 简体中文

这是一个 Obsidian 插件，用于把粘贴图片和笔记中的图片上传到远程 GitHub 仓库。

### 功能

- 粘贴图片文件时先上传，再插入最终的 Markdown 图片链接。
- 保存笔记或执行命令时，上传当前笔记中的图片链接。
- 在编辑器右键菜单中上传光标处或选区内的图片。
- 仅在上传成功后原地替换图片链接。
- 可选：上传并替换成功后删除 vault 内的原始本地图片。
- 支持 GitHub raw URL 或自定义域名/CDN 生成公开图片地址。
- 可选：私有仓库图片 URL 模式，将 token 嵌入 raw GitHub 图片地址。
- 可配置上传并发数和日志等级。
- 短时间内存哈希缓存会复用最近上传过的图片地址，跳过重复上传。
- 上传路径格式为 `文档名/图片原始名-随机字符串.ext`。
- 界面语言：简体中文、繁體中文、English、한국어、日本語。

### 配置

打开 Obsidian 设置，找到 **Ok Obsidian Plugin Image**，然后配置：

- GitHub 仓库 short path：`owner/repo`
- 分支，例如 `main`
- 拥有目标仓库 `contents:write` 权限的 Personal Access Token
- 可选自定义域名或 CDN，例如 `https://img.example.com`
- 上传并发数
- 日志等级

上传图片会放在当前文档名合规化后的目录下。例如在 `我的笔记.md` 中粘贴 `截图.png`，会生成类似：

```text
我的笔记/截图-a1b2c3d4e5.png
```

### 私有仓库

Markdown 图片请求无法附加 `Authorization` 请求头。启用私有图片 URL 模式后，插件会生成 `x-access-token` basic-auth 风格的 GitHub raw URL。只要笔记可见，token 就可能被暴露。

自定义域名和第三方 CDN 通常无法自动使用 GitHub token，因此私有仓库图片可能无法通过自定义域名访问。

### 开发

```bash
npm install
npm run dev
npm run build
```

手动测试时，把本仓库复制或软链接到：

```text
<vault>/.obsidian/plugins/ok-obsidian-plugin-image
```

运行时文件：

- `manifest.json`
- `main.js`
- `styles.css`

### 发布流程

本项目使用 Changesets 和 GitHub Actions。

- 带 changeset 的新提交进入 `main` 后，会创建或更新 version PR。
- 合并 version PR 后会更新版本文件和 changelog。
- 合并后 release workflow 会构建插件、创建 tag、创建 GitHub Release，并上传 `main.js`、`manifest.json`、`styles.css`。

## 繁體中文

這是一個 Obsidian 外掛，用於將貼上的圖片與筆記中的圖片上傳到遠端 GitHub 倉庫。

### 功能

- 貼上圖片檔案時先上傳，再插入最終 Markdown 圖片連結。
- 儲存筆記或執行命令時，上傳目前筆記中的圖片連結。
- 從編輯器右鍵選單上傳游標處或選取範圍內的圖片。
- 僅在上傳成功後原地替換圖片連結。
- 可選：上傳並替換成功後刪除 vault 內的原始本機圖片。
- 支援 GitHub raw URL 或自訂網域/CDN 產生公開圖片位址。
- 可選：私有倉庫圖片 URL 模式，將 token 嵌入 raw GitHub 圖片位址。
- 可設定上傳並行數與日誌等級。
- 短時間記憶體雜湊快取會重用最近上傳過的圖片位址，跳過重複上傳。
- 上傳路徑格式為 `文件名/圖片原始名-隨機字串.ext`。
- 介面語言：简体中文、繁體中文、English、한국어、日本語。

### 設定

開啟 Obsidian 設定，找到 **Ok Obsidian Plugin Image**，然後設定：

- GitHub 倉庫 short path：`owner/repo`
- 分支，例如 `main`
- 具備目標倉庫 `contents:write` 權限的 Personal Access Token
- 可選自訂網域或 CDN，例如 `https://img.example.com`
- 上傳並行數
- 日誌等級

上傳圖片會放在目前文件名合規化後的目錄下。例如在 `我的筆記.md` 中貼上 `截圖.png`，會產生類似：

```text
我的筆記/截圖-a1b2c3d4e5.png
```

### 私有倉庫

Markdown 圖片請求無法附加 `Authorization` 請求標頭。啟用私有圖片 URL 模式後，外掛會產生 `x-access-token` basic-auth 形式的 GitHub raw URL。只要筆記可見，token 就可能被暴露。

自訂網域和第三方 CDN 通常無法自動使用 GitHub token，因此私有倉庫圖片可能無法透過自訂網域存取。

### 開發

```bash
npm install
npm run dev
npm run build
```

手動測試時，將本倉庫複製或建立符號連結到：

```text
<vault>/.obsidian/plugins/ok-obsidian-plugin-image
```

執行時檔案：

- `manifest.json`
- `main.js`
- `styles.css`

### 發布流程

本專案使用 Changesets 和 GitHub Actions。

- 帶有 changeset 的新提交進入 `main` 後，會建立或更新 version PR。
- 合併 version PR 後會更新版本檔案與 changelog。
- 合併後 release workflow 會建置外掛、建立 tag、建立 GitHub Release，並上傳 `main.js`、`manifest.json`、`styles.css`。

## 한국어

붙여넣은 이미지와 노트 안의 이미지를 원격 GitHub 저장소로 업로드하는 Obsidian 플러그인입니다.

### 기능

- 이미지 파일을 붙여넣으면 먼저 업로드한 뒤 최종 Markdown 이미지 링크를 삽입합니다.
- 노트 저장 시 또는 명령 실행 시 현재 노트의 이미지 링크를 업로드합니다.
- 편집기 컨텍스트 메뉴에서 커서 위치 또는 선택 영역의 이미지를 업로드합니다.
- 업로드가 성공한 뒤에만 이미지 링크를 제자리에서 교체합니다.
- 선택 사항: 업로드와 교체가 성공하면 vault의 원본 로컬 이미지를 삭제합니다.
- GitHub raw URL 또는 사용자 지정 도메인/CDN으로 공개 이미지 URL을 생성합니다.
- 선택 사항: 비공개 저장소 이미지 URL에 token을 포함하는 모드.
- 업로드 동시성 및 로그 레벨을 설정할 수 있습니다.
- 짧은 시간 동안 유지되는 메모리 해시 캐시가 최근 업로드된 이미지 URL을 재사용하여 중복 업로드를 건너뜁니다.
- 업로드 경로 형식은 `문서명/원본이미지명-랜덤문자열.ext`입니다.
- UI 언어: 简体中文, 繁體中文, English, 한국어, 日本語.

### 설정

Obsidian 설정에서 **Ok Obsidian Plugin Image**를 찾아 다음을 설정합니다.

- GitHub 저장소 short path: `owner/repo`
- 브랜치, 예: `main`
- 대상 저장소에 `contents:write` 권한이 있는 Personal Access Token
- 선택 사항인 사용자 지정 도메인 또는 CDN, 예: `https://img.example.com`
- 업로드 동시성
- 로그 레벨

업로드된 이미지는 현재 문서명을 정리한 폴더 아래에 저장됩니다. 예를 들어 `내 노트.md`에 `screenshot.png`를 붙여넣으면 다음과 비슷한 경로가 생성됩니다.

```text
내-노트/screenshot-a1b2c3d4e5.png
```

### 비공개 저장소

Markdown 이미지 요청은 `Authorization` 헤더를 첨부할 수 없습니다. 비공개 이미지 URL 모드를 켜면 플러그인은 `x-access-token` basic-auth 형태의 GitHub raw URL을 생성합니다. 노트가 보이는 곳에서는 token이 노출될 수 있습니다.

사용자 지정 도메인과 타사 CDN은 일반적으로 GitHub token을 자동으로 사용할 수 없으므로, 비공개 저장소 이미지는 사용자 지정 도메인에서 동작하지 않을 수 있습니다.

### 개발

```bash
npm install
npm run dev
npm run build
```

수동 테스트를 위해 이 저장소를 다음 위치로 복사하거나 심볼릭 링크합니다.

```text
<vault>/.obsidian/plugins/ok-obsidian-plugin-image
```

런타임 파일:

- `manifest.json`
- `main.js`
- `styles.css`

### 릴리스 흐름

이 프로젝트는 Changesets와 GitHub Actions를 사용합니다.

- changeset이 포함된 새 커밋이 `main`에 들어가면 version PR을 만들거나 업데이트합니다.
- version PR을 병합하면 버전 파일과 changelog가 업데이트됩니다.
- 병합 후 release workflow가 플러그인을 빌드하고 tag와 GitHub Release를 만든 뒤 `main.js`, `manifest.json`, `styles.css`를 업로드합니다.

## 日本語

貼り付けた画像やノート内の画像をリモート GitHub リポジトリへアップロードする Obsidian プラグインです。

### 機能

- 画像ファイルを貼り付けたとき、先にアップロードしてから最終的な Markdown 画像リンクを挿入します。
- ノート保存時、またはコマンド実行時に、現在のノート内の画像リンクをアップロードします。
- エディターのコンテキストメニューから、カーソル位置または選択範囲内の画像をアップロードします。
- アップロード成功後にのみ画像リンクをその場で置換します。
- 任意: アップロードと置換が成功した後、vault 内の元ローカル画像を削除します。
- GitHub raw URL またはカスタムドメイン/CDN で公開画像 URL を生成します。
- 任意: プライベートリポジトリ画像 URL に token を埋め込むモード。
- アップロード同時数とログレベルを設定できます。
- 短時間のインメモリハッシュキャッシュにより、最近アップロードした画像 URL を再利用し、重複アップロードをスキップします。
- アップロードパス形式は `ドキュメント名/元画像名-ランダム文字列.ext` です。
- UI 言語: 简体中文、繁體中文、English、한국어、日本語。

### 設定

Obsidian 設定で **Ok Obsidian Plugin Image** を探し、次を設定します。

- GitHub リポジトリ short path: `owner/repo`
- ブランチ、例: `main`
- 対象リポジトリに `contents:write` 権限を持つ Personal Access Token
- 任意のカスタムドメインまたは CDN、例: `https://img.example.com`
- アップロード同時数
- ログレベル

アップロード画像は、現在のドキュメント名を整形したフォルダーの下に保存されます。例えば `私のノート.md` に `screenshot.png` を貼り付けると、次のようなパスが作成されます。

```text
私のノート/screenshot-a1b2c3d4e5.png
```

### プライベートリポジトリ

Markdown の画像リクエストには `Authorization` ヘッダーを付けられません。プライベート画像 URL モードを有効にすると、プラグインは `x-access-token` basic-auth 形式の GitHub raw URL を生成します。ノートが表示される場所では token が露出する可能性があります。

カスタムドメインやサードパーティ CDN は通常 GitHub token を自動的に利用できないため、プライベートリポジトリ画像はカスタムドメイン経由では動作しない場合があります。

### 開発

```bash
npm install
npm run dev
npm run build
```

手動テストでは、このリポジトリを次の場所へコピーまたはシンボリックリンクします。

```text
<vault>/.obsidian/plugins/ok-obsidian-plugin-image
```

ランタイムファイル:

- `manifest.json`
- `main.js`
- `styles.css`

### リリースフロー

このプロジェクトは Changesets と GitHub Actions を使用します。

- changeset を含む新しいコミットが `main` に入ると、version PR が作成または更新されます。
- version PR をマージすると、バージョンファイルと changelog が更新されます。
- マージ後、release workflow がプラグインをビルドし、tag と GitHub Release を作成して、`main.js`、`manifest.json`、`styles.css` をアップロードします。
