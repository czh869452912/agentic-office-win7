const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { mkdtempSync, writeFileSync } = require('node:fs')
const { tmpdir, release } = require('node:os')
const { join } = require('node:path')
const { app, BrowserWindow, WebContentsView, ipcMain } = require('electron')
const { upstream, runtime } = require('../manifest/baseline.json')

const outputPath = process.env.GENOFFICE_RUNTIME_PROBE_RESULT
const tempDir = mkdtempSync(join(tmpdir(), 'genoffice-runtime-probe-'))
const webPreferences = { sandbox: true, contextIsolation: true, nodeIntegration: false }
const results = []
const pageUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent('<h1>GenOffice Runtime</h1>')
const pingChannel = 'runtime-probe:ping'
let finished = false

app.setPath('userData', tempDir)
app.on('window-all-closed', () => {})

function finish(error) {
  if (finished) return
  finished = true
  clearTimeout(timeout)
  const report = {
    upstreamCommit: upstream.commit,
    platform: process.platform,
    arch: process.arch,
    osRelease: release(),
    profileDir: tempDir,
    versions: process.versions,
    results,
    error: error ? String(error.stack ?? error) : undefined,
  }
  const json = JSON.stringify(report, null, 2) + '\n'
  let failed = Boolean(error) || results.some(({ status }) => status === 'fail')
  try {
    if (outputPath) writeFileSync(outputPath, json)
    else process.stdout.write(json)
  } catch (writeError) {
    failed = true
    console.error(writeError)
  }
  app.exit(failed ? 1 : 0)
}

async function check(id, run) {
  try {
    results.push({ id, status: 'pass', detail: await run() })
  } catch (error) {
    results.push({ id, status: 'fail', error: String(error.stack ?? error) })
  }
}

async function checkView(window, views, number) {
  const view = new WebContentsView({ webPreferences })
  views.push(view)
  window.contentView.addChildView(view)
  view.setBounds({ x: 0, y: 0, width: 400, height: 300 })
  await view.webContents.loadURL('data:text/html,' + number)
  assert.equal(
    await view.webContents.executeJavaScript('document.body.textContent'),
    String(number),
  )
}

async function run() {
  await check('rt01-versions', () => {
    assert.equal(process.versions.electron, runtime.electron)
    assert.equal(process.versions.chrome, runtime.chromium)
    assert.equal(process.versions.node, runtime.node)
  })

  await check('rt02-sqlite', () => {
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(join(tempDir, 'probe.sqlite'))
    try {
      db.exec('CREATE TABLE probe (value TEXT)')
      const expected = createHash('sha256').update('GenOffice').digest('hex')
      db.prepare('INSERT INTO probe VALUES (?)').run(expected)
      assert.equal(db.prepare('SELECT value FROM probe').get().value, expected)
    } finally {
      db.close()
    }
  })

  const window = new BrowserWindow({
    show: false,
    webPreferences: { ...webPreferences, preload: join(__dirname, 'preload.cjs') },
  })
  const { webContents } = window
  const views = []
  ipcMain.handle(pingChannel, (event) => {
    assert.equal(event.sender.id, webContents.id)
    assert.equal(event.senderFrame, webContents.mainFrame)
    return 'pong'
  })
  try {
    await check('rt03-five-views', async () => {
      for (let number = 1; number <= 5; number++) {
        await checkView(window, views, number)
      }
    })

    await check('rt04-sandbox-ipc', async () => {
      await webContents.loadURL(pageUrl)
      const actual = await webContents.executeJavaScript(`(async () => ({
        sandboxed: window.runtimeProbe.sandboxed,
        contextIsolated: window.runtimeProbe.contextIsolated,
        require: typeof window.require,
        process: typeof window.process,
        reply: await window.runtimeProbe.ping(),
      }))()`)
      assert.deepEqual(actual, {
        sandboxed: true,
        contextIsolated: true,
        require: 'undefined',
        process: 'undefined',
        reply: 'pong',
      })
      return actual
    })

    await check('rt06-print-to-pdf', async () => {
      await webContents.loadURL(pageUrl)
      const bytes = await webContents.printToPDF({})
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
      return { bytes: bytes.length }
    })
  } finally {
    ipcMain.removeHandler(pingChannel)
    for (const view of views) {
      window.contentView.removeChildView(view)
      view.webContents.close()
    }
    window.destroy()
  }
}

const timeout = setTimeout(() => finish(new Error('Probe timed out after 60 seconds')), 60_000)
app
  .whenReady()
  .then(run)
  .then(() => finish(), finish)
