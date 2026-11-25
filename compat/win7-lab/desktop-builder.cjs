// Uses the normal Shell layout for the unpacked Win7 candidate and lab installer.
const { existsSync, readFileSync } = require('node:fs')
const { basename, join, resolve } = require('node:path')

const repo = resolve(__dirname, '../..')
const shell = join(repo, 'apps/shell')
const lab = join(repo, 'working_dir/win7-docker/shared/desktop44')
const runtime = join(lab, 'runtime')
const native = join(repo, 'working_dir/win7-docker/native-build/x86_64-win7-windows-msvc/release')
const upstream = require('../../apps/shell/electron-builder.cjs')
const electronVersion = '44.2.0'
const actualVersion = readFileSync(join(runtime, 'version'), 'utf8').trim().replace(/^v/, '')
if (actualVersion !== electronVersion) {
  throw new Error(`Expected Win7 Electron ${electronVersion}, got ${actualVersion}`)
}

const resources = upstream.extraResources
  .filter((item) => !item.to.startsWith('ocr/'))
  .map((item) =>
    item.to === 'LICENSES.chromium.html' ? { ...item, from: join(runtime, item.to) } : item,
  )
const winResources = upstream.win.extraResources.map((item) =>
  item.to.startsWith('native/') ? { ...item, from: join(native, basename(item.to)) } : item,
)

module.exports = {
  ...upstream,
  directories: { ...upstream.directories, output: join(lab, 'candidate-build') },
  electronVersion,
  electronDist: runtime,
  extraResources: resources,
  win: {
    ...upstream.win,
    target: 'dir',
    signAndEditExecutable: false,
    extraResources: winResources,
  },
  nsis: {
    ...upstream.nsis,
    artifactName: 'GenOffice-Win7-${arch}-Lab-${version}-Setup.${ext}',
  },
  publish: null,
  beforePack: () => {
    for (const item of [...resources, ...winResources]) {
      if (!existsSync(resolve(shell, item.from))) {
        throw new Error(`Missing Win7 lab resource: ${item.from}`)
      }
    }
  },
}
