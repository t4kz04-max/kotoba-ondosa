// 応募用の作品データ（ZIP）を作る。
// 中身：Git で管理しているファイル ＋ ビルド済みの dist/。
// 含めないもの：node_modules/・.git/（履歴）・.env・docs/references/（.gitignore で除外済み）。
// 使い方（Windows）：npm run build のあとに node scripts/make-submission-zip.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'release')
const outFile = path.join(outDir, 'kotoba-ondosa-submission.zip')

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ がありません。先に npm run build を実行してください。')
  process.exit(1)
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((file) => file !== '')

const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'kotoba-submission-'))
// ZIP の直下に README.md などが来るように、フォルダを挟まずに入れる
const base = staging
for (const file of tracked) {
  const to = path.join(base, file)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(path.join(root, file), to)
}
fs.cpSync(path.join(root, 'dist'), path.join(base, 'dist'), { recursive: true })

fs.mkdirSync(outDir, { recursive: true })
fs.rmSync(outFile, { force: true })
// Windows 10 以降に標準で入っている tar（bsdtar）は、拡張子 .zip で ZIP 形式を作れる。
// Git Bash などの GNU tar は ZIP を作れないので、Windows では System32 の tar.exe を明示して使う
const tar =
  process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar'
execFileSync(tar, ['-a', '-c', '-f', outFile, '-C', staging, ...fs.readdirSync(staging)], { stdio: 'inherit' })
fs.rmSync(staging, { recursive: true, force: true })

const size = fs.statSync(outFile).size
console.log(`作成しました：${path.relative(root, outFile)}（${(size / 1024 / 1024).toFixed(2)} MB、${tracked.length} ファイル ＋ dist/）`)
