import _ from 'lodash'
import fs from 'mz/fs'
import glob from 'glob'
import path from 'path'
import Promise from 'bluebird'

export default class PathExpander {
  constructor(directory) {
    this.directory = directory
  }

  async expandPathsWithExtensions(paths, extensions) {
    const expandedPaths = await Promise.map(paths, async (p) => {
      return await this.expandPathWithExtensions(p, extensions)
    })
    return _.uniq(_.flatten(expandedPaths))
  }

  async expandPathWithExtensions(p, extensions) {
    const realPath = await fs.realpath(path.resolve(this.directory, p))
    const stats = await fs.stat(realPath)
    if (stats.isDirectory()) {
      return await this.expandDirectoryWithExtensions(realPath, extensions)
    } else {
      return [realPath]
    }
  }

  expandDirectoryWithExtensions(realPath, extensions) {
    let pattern = realPath + '/**/*.'
    if (extensions.length > 1) {
      pattern += '{' + extensions.join(',') + '}'
    } else {
      pattern += extensions[0]
    }
    return Promise.promisify(glob)(pattern)
  }
}
