import _ from 'lodash'
import {getExpandedArgv, getFeatures, getSupportCodeFunctions} from './helpers'
import ConfigurationBuilder from './configuration_builder'
import FormatterBuilder from '../listener/formatter/builder'
import fs from 'mz/fs'
import Promise from 'bluebird'
import Runtime from '../runtime'
import ScenarioFilter from '../scenario_filter'
import SupportCodeLibraryBuilder from '../support_code_library_builder'

export default class Cli {
  constructor ({argv, cwd, stdout}) {
    this.argv = argv
    this.cwd = cwd
    this.stdout = stdout
  }

  async getConfiguration() {
    const fullArgv = await getExpandedArgv({argv: this.argv, cwd: this.cwd})
    return await ConfigurationBuilder.build({argv: fullArgv, cwd: this.cwd})
  }

  async getFormatters({formatOptions, formats, supportCodeLibrary}) {
    const streamsToClose = []
    const formatters = await Promise.map(formats, async ({type, outputTo}) => {
      let stream = this.stdout
      if (outputTo) {
        let fd = await fs.open(outputTo, 'w')
        stream = fs.createWriteStream(null, {fd})
        streamsToClose.push(stream)
      }
      const typeOptions = _.assign({log: ::stream.write, supportCodeLibrary}, formatOptions)
      return FormatterBuilder.build(type, typeOptions)
    })
    const cleanup = function() {
      return Promise.each(streamsToClose, (stream) => Promise.promisify(::stream.end)())
    }
    return {cleanup, formatters}
  }

  getSupportCodeLibrary(supportCodePaths) {
    const fns = getSupportCodeFunctions(supportCodePaths)
    return SupportCodeLibraryBuilder.build({cwd: this.cwd, fns})
  }

  async run() {
    const configuration = await this.getConfiguration()
    const supportCodeLibrary = this.getSupportCodeLibrary(configuration.supportCodePaths)
    const [features, {cleanup, formatters}] = await Promise.all([
      getFeatures(configuration.featurePaths),
      this.getFormatters({
        formatOptions: configuration.formatOptions,
        formats: configuration.formats,
        supportCodeLibrary
      })
    ])
    const scenarioFilter = new ScenarioFilter(configuration.scenarioFilterOptions)
    const runtime = new Runtime({
      features,
      listeners: formatters,
      options: configuration.runtimeOptions,
      scenarioFilter,
      supportCodeLibrary
    })
    const result = await runtime.start()
    await cleanup()
    return result
  }
}
