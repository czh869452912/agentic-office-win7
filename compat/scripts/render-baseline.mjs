import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { release, tmpdir } from 'node:os'
import { basename, delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const electron = require('electron')
const { upstream, runtime } = require('../manifest/baseline.json')
const cli = join(repo, 'packages/cli/dist/genoffice.cjs')
const reportDir = mkdtempSync(join(tmpdir(), 'genoffice-render-baseline-'))
const pptx = 'packages/pptx-engine/tests/fixtures/01_standard_business.pptx'
const cases = [
  { id: 'docx', fixture: 'fixtures/generated/simple.docx', command: ['render'], flags: ['--grid'] },
  {
    id: 'xlsx',
    fixture: 'apps/sheets/fixtures/generated/compatibility-basic.xlsx',
    command: ['render'],
    flags: ['--grid'],
  },
  { id: 'pptx', fixture: pptx, command: ['render'], flags: ['--grid'] },
  { id: 'slides', fixture: pptx, command: ['slides', 'render'], flags: [] },
  {
    id: 'invalid-page',
    fixture: 'fixtures/generated/simple.docx',
    command: ['render'],
    flags: ['--page', '999'],
    expectFailure: true,
  },
]

async function hashFile(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function checkPng(file, out) {
  const path = resolve(file.path)
  assert.equal(dirname(path), out)
  assert.match(basename(path), /\.png$/i)
  const png = PNG.sync.read(readFileSync(path))
  assert.equal(png.width, file.width)
  assert.equal(png.height, file.height)
  const firstPixel = png.data.readUInt32BE(0)
  let hasVariation = false
  for (let i = 4; i < png.data.length; i += 4) {
    if (png.data.readUInt32BE(i) !== firstPixel) {
      hasVariation = true
      break
    }
  }
  assert.ok(hasVariation, 'PNG contains only one color')
  return {
    file: basename(path),
    width: png.width,
    height: png.height,
    sha256: await hashFile(path),
  }
}

async function runCase(test) {
  const directory = join(reportDir, test.id)
  const scratch = join(directory, 'tmp')
  const out = join(directory, 'png')
  for (const path of [scratch, out]) mkdirSync(path, { recursive: true })
  const action = [...test.command, test.fixture, '--out', out, ...test.flags, '--json']
  const start = Date.now()
  const result = spawnSync(electron, [cli, ...action], {
    cwd: repo,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      GENOFFICE_APP_BIN: '',
      GENOFFICE_ALLOWED_ROOTS: [repo, reportDir].join(delimiter),
      GENOFFICE_USER_DATA: join(directory, 'profile'),
      TEMP: scratch,
      TMP: scratch,
      TMPDIR: scratch,
    },
    encoding: 'utf8',
    timeout: 190_000,
    windowsHide: true,
  })
  writeFileSync(join(directory, 'stdout.txt'), result.stdout ?? '')
  writeFileSync(join(directory, 'stderr.txt'), result.stderr ?? '')
  const entry = {
    testId: 'T08',
    caseId: test.id,
    fixture: test.fixture,
    fixtureSha256: await hashFile(join(repo, test.fixture)),
    durationMs: Date.now() - start,
    exitCode: result.status,
  }
  try {
    assert.ifError(result.error)
    const payload = JSON.parse(result.stdout)
    const remainingPdf = readdirSync(scratch).filter((file) =>
      /^genoffice-render-.*\.pdf$/i.test(file),
    )
    assert.deepEqual(remainingPdf, [])
    if (test.expectFailure) {
      assert.ok(result.status > 0)
      assert.equal(payload.status, 'error')
      assert.match(JSON.stringify(payload), /out of range/i)
      assert.deepEqual(readdirSync(out), [])
      return {
        ...entry,
        status: 'pass',
        remainingPdf: 0,
        outputs: [],
        rejection: 'page-out-of-range',
      }
    }
    assert.equal(result.status, 0, payload.summary)
    assert.equal(payload.status, 'ok')
    const { files, grid } = payload.detail
    assert.ok(files.length > 0, 'No rendered pages')
    assert.deepEqual(
      files.map((file) => file.page ?? file.slide + 1),
      files.map((_, i) => i + 1),
    )
    if (test.flags.includes('--grid')) assert.equal(grid.tiles.length, files.length)
    const outputs = await Promise.all(
      [...files, ...(grid ? [grid] : [])].map((file) => checkPng(file, out)),
    )
    assert.deepEqual(readdirSync(out).sort(), outputs.map((file) => file.file).sort())
    return { ...entry, status: 'pass', remainingPdf: 0, renderedPages: files.length, outputs }
  } catch (error) {
    return { ...entry, status: 'fail', error: String(error.message) }
  }
}

const sourceDiff = spawnSync(
  'git',
  [
    'diff',
    '--quiet',
    upstream.commit,
    '--',
    'apps/',
    'packages/',
    'native/',
    'package.json',
    'package-lock.json',
  ],
  { cwd: repo, windowsHide: true },
)
assert.equal(
  sourceDiff.status,
  0,
  'Build the unmodified upstream application before recording an A run',
)
const versionCheck = spawnSync(electron, ['-p', 'process.versions.electron'], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  encoding: 'utf8',
  timeout: 10000,
  windowsHide: true,
})
assert.ifError(versionCheck.error)
assert.equal(versionCheck.status, 0)
const electronVersion = versionCheck.stdout.trim()
assert.equal(electronVersion, runtime.electron)

const report = {
  runAt: new Date().toISOString(),
  scope: 'upstream-render-smoke',
  comparison: 'A',
  profile: 'upstream',
  upstreamSha: upstream.commit,
  osBuild: release(),
  platform: process.platform,
  arch: process.arch,
  electron: electronVersion,
  runtimeSha256: await hashFile(electron),
  results: [],
}
for (const test of cases) report.results.push(await runCase(test))
writeFileSync(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(reportDir)
console.table(
  report.results.map(({ caseId, status, renderedPages, error }) => ({
    caseId,
    status,
    renderedPages,
    error,
  })),
)
process.exitCode = report.results.some(({ status }) => status === 'fail') ? 1 : 0
