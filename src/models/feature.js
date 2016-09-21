import _ from 'lodash'
import Tag from './tag'
import Scenario from './scenario'

export default class Feature {
  constructor ({gherkinData, gherkinPickles, uri}) {
    this.description = gherkinData.description
    this.keyword = gherkinData.keyword
    this.line = gherkinData.location.line
    this.name = gherkinData.name
    this.tags = _.map(gherkinData.tags, Tag.build)
    this.uri = uri

    const stepLineToKeywordMapping = _.chain(gherkinData.children)
      .map('steps')
      .flatten()
      .map((step) => [step.location.line, step.keyword])
      .fromPairs()
      .value()

    this.scenarios = _.map(gherkinPickles, (gherkinPickle) => {
      return new Scenario({
        feature: this,
        gherkinData: gherkinPickle,
        language: gherkinData.language,
        stepLineToKeywordMapping
      })
    })

    Object.freeze(this)
  }
}
