import type { Locale } from "../types";

type Dict = Record<string, string>;

const en: Dict = {
  settingsTitle: "Ok Obsidian Plugin Image",
  generalTab: "General",
  activeStore: "Active remote store",
  activeStoreDesc: "Only GitHub stores are implemented in this release.",
  storeName: "Store name",
  addStore: "Add GitHub store",
  removeStore: "Remove current store",
  githubRepo: "GitHub repository",
  githubRepoDesc: "Short path in owner/repo format.",
  branch: "Branch",
  basePath: "Upload path",
  basePathDesc: "Supports {yyyy}, {MM}, {dd}, {timestamp}, {name}, {ext}.",
  token: "Personal access token",
  tokenDesc: "Requires contents:write for the target repository.",
  customDomain: "Custom domain or CDN",
  customDomainDesc: "Example: https://img.example.com. Leave empty to use GitHub raw URLs.",
  privateImages: "Use token in private image URLs",
  privateImagesDesc: "Embeds the token in generated image URLs for private repositories.",
  privateImagesWarning: "Custom domains cannot add GitHub authorization headers. Private image URLs may expose the token and may not work through custom domains.",
  concurrency: "Upload concurrency",
  locale: "Language",
  logLevel: "Log level",
  deleteLocal: "Delete local vault images after upload",
  uploadImage: "Upload image to remote store",
  uploadAndReplaceImage: "Upload and replace with remote URL",
  uploadCurrentFile: "Upload and replace all images in current note with remote URLs",
  missingConfig: "Configure GitHub repository and token first.",
  uploadDone: "Image uploaded.",
  batchDone: "Images uploaded.",
  batchSkipped: "No uploadable images found.",
  uploadFailed: "Image upload failed.",
  zhCN: "Simplified Chinese",
  zhTW: "Traditional Chinese",
  english: "English",
  korean: "Korean",
  japanese: "Japanese",
  auto: "Auto",
  trace: "Trace",
  debug: "Debug",
  log: "Log",
  info: "Info",
  warn: "Warn",
  error: "Error",
  off: "Off"
};

const zhCN: Dict = {
  ...en,
  settingsTitle: "OK 图片上传",
  generalTab: "常规",
  activeStore: "当前远程 Store",
  activeStoreDesc: "这一期仅实现 GitHub repo store。",
  storeName: "Store 名称",
  addStore: "新增 GitHub store",
  removeStore: "删除当前 store",
  githubRepo: "GitHub 仓库",
  githubRepoDesc: "使用 owner/repo 格式填写 short path。",
  branch: "分支",
  basePath: "上传路径",
  basePathDesc: "支持 {yyyy}、{MM}、{dd}、{timestamp}、{name}、{ext}。",
  token: "Personal Access Token",
  tokenDesc: "需要目标仓库 contents:write 权限。",
  customDomain: "自定义域名或 CDN",
  customDomainDesc: "例如：https://img.example.com。留空则使用 GitHub raw 地址。",
  privateImages: "私有图片 URL 使用 token",
  privateImagesDesc: "为私有仓库生成带 token 的图片地址。",
  privateImagesWarning: "自定义域名无法附加 GitHub 授权请求头。私有图片 URL 可能暴露 token，且可能无法通过自定义域名访问。",
  concurrency: "上传并发数",
  locale: "语言",
  logLevel: "日志等级",
  deleteLocal: "上传后删除 vault 内本地图片",
  uploadImage: "上传图片到远程 Store",
  uploadAndReplaceImage: "上传并替换为远程地址",
  uploadCurrentFile: "上传并替换当前文章内所有图片至远程地址",
  missingConfig: "请先配置 GitHub 仓库和 token。",
  uploadDone: "图片已上传。",
  batchDone: "图片已上传。",
  batchSkipped: "没有找到可上传的图片。",
  uploadFailed: "图片上传失败。",
  zhCN: "简体中文",
  zhTW: "繁體中文",
  english: "English",
  korean: "한국어",
  japanese: "日本語",
  auto: "自动",
  trace: "Trace",
  debug: "Debug",
  log: "Log",
  info: "Info",
  warn: "Warn",
  error: "Error",
  off: "Off"
};

const zhTW: Dict = {
  ...zhCN,
  settingsTitle: "OK 圖片上傳",
  generalTab: "常規",
  activeStore: "目前遠端 Store",
  activeStoreDesc: "此版本僅實作 GitHub repo store。",
  storeName: "Store 名稱",
  addStore: "新增 GitHub store",
  removeStore: "刪除目前 store",
  githubRepo: "GitHub 倉庫",
  githubRepoDesc: "使用 owner/repo 格式填寫 short path。",
  branch: "分支",
  basePath: "上傳路徑",
  customDomain: "自訂網域或 CDN",
  privateImages: "私有圖片 URL 使用 token",
  privateImagesWarning: "自訂網域無法附加 GitHub 授權請求標頭。私有圖片 URL 可能暴露 token，且可能無法透過自訂網域存取。",
  concurrency: "上傳並行數",
  locale: "語言",
  logLevel: "日誌等級",
  deleteLocal: "上傳後刪除 vault 內本機圖片",
  uploadImage: "上傳圖片到遠端 Store",
  uploadAndReplaceImage: "上傳並替換為遠端位址",
  uploadCurrentFile: "上傳並替換目前文章內所有圖片為遠端位址",
  missingConfig: "請先設定 GitHub 倉庫和 token。",
  uploadDone: "圖片已上傳。",
  batchDone: "圖片已上傳。",
  batchSkipped: "沒有找到可上傳的圖片。",
  uploadFailed: "圖片上傳失敗。",
  auto: "自動"
};

const ko: Dict = {
  ...en,
  settingsTitle: "OK 이미지 업로더",
  generalTab: "일반",
  activeStore: "활성 원격 Store",
  activeStoreDesc: "이번 릴리스에서는 GitHub repo store만 지원합니다.",
  storeName: "Store 이름",
  addStore: "GitHub store 추가",
  removeStore: "현재 store 삭제",
  githubRepo: "GitHub 저장소",
  githubRepoDesc: "owner/repo 형식의 short path를 입력합니다.",
  branch: "브랜치",
  basePath: "업로드 경로",
  token: "Personal Access Token",
  customDomain: "사용자 지정 도메인 또는 CDN",
  privateImages: "비공개 이미지 URL에 token 사용",
  privateImagesWarning: "사용자 지정 도메인은 GitHub 인증 헤더를 추가할 수 없습니다. 비공개 이미지 URL은 token을 노출할 수 있으며 사용자 지정 도메인에서 동작하지 않을 수 있습니다.",
  concurrency: "업로드 동시성",
  locale: "언어",
  logLevel: "로그 레벨",
  deleteLocal: "업로드 후 vault 로컬 이미지 삭제",
  uploadImage: "이미지를 원격 Store에 업로드",
  uploadAndReplaceImage: "업로드하고 원격 URL로 교체",
  uploadCurrentFile: "현재 노트의 모든 이미지를 업로드하고 원격 URL로 교체",
  missingConfig: "먼저 GitHub 저장소와 token을 설정하세요.",
  uploadDone: "이미지가 업로드되었습니다.",
  batchDone: "이미지가 업로드되었습니다.",
  batchSkipped: "업로드할 이미지가 없습니다.",
  uploadFailed: "이미지 업로드에 실패했습니다.",
  auto: "자동"
};

const ja: Dict = {
  ...en,
  settingsTitle: "OK 画像アップローダー",
  generalTab: "一般",
  activeStore: "有効なリモート Store",
  activeStoreDesc: "このリリースでは GitHub repo store のみ実装しています。",
  storeName: "Store 名",
  addStore: "GitHub store を追加",
  removeStore: "現在の store を削除",
  githubRepo: "GitHub リポジトリ",
  githubRepoDesc: "owner/repo 形式の short path を入力します。",
  branch: "ブランチ",
  basePath: "アップロードパス",
  token: "Personal Access Token",
  customDomain: "カスタムドメインまたは CDN",
  privateImages: "プライベート画像 URL に token を使用",
  privateImagesWarning: "カスタムドメインでは GitHub 認証ヘッダーを付与できません。プライベート画像 URL は token を露出する可能性があり、カスタムドメインでは動作しない場合があります。",
  concurrency: "アップロード同時数",
  locale: "言語",
  logLevel: "ログレベル",
  deleteLocal: "アップロード後に vault 内のローカル画像を削除",
  uploadImage: "画像をリモート Store にアップロード",
  uploadAndReplaceImage: "アップロードしてリモート URL に置換",
  uploadCurrentFile: "現在のノート内のすべての画像をアップロードしてリモート URL に置換",
  missingConfig: "先に GitHub リポジトリと token を設定してください。",
  uploadDone: "画像をアップロードしました。",
  batchDone: "画像をアップロードしました。",
  batchSkipped: "アップロード可能な画像はありません。",
  uploadFailed: "画像のアップロードに失敗しました。",
  auto: "自動"
};

const DICTS: Record<Exclude<Locale, "auto">, Dict> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en,
  ko,
  ja
};

export function resolveLocale(locale: Locale): Exclude<Locale, "auto"> {
  if (locale !== "auto") return locale;
  const lang = window.navigator.language;
  if (lang.startsWith("zh-TW") || lang.startsWith("zh-HK") || lang.startsWith("zh-MO")) return "zh-TW";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

export function createTranslator(getLocale: () => Locale): (key: string) => string {
  return (key: string) => {
    const dict = DICTS[resolveLocale(getLocale())];
    return dict[key] ?? en[key] ?? key;
  };
}
