
let _ = require('lodash')

let defaultField = {
  type: 'ngram',
  boost: 1
}

let ngrams = function (text) {
  let pieces = []

  if (_.isString(text)) {
    text = text.toLowerCase().replace(/[^a-zA-Z0-9%@!$#?]+/g, '')
    for (let i = 0; i < text.length - 2; i += 1) {
      pieces.push(text.slice(i, i + 3))
    }
  }

  return pieces
}

let ngramMatch = function (ngrams1, ngrams2, minRelevance = 0) {
  let hitCount = 0
  let union = ngrams1.length + ngrams2.length
  let gramValue = ((ngrams1.length - 1) / ngrams1.length) * 100

  for (let i = 0; i < ngrams1.length; i += 1) {
    let potentialRelevance = gramValue * (ngrams1.length + hitCount - i)
    if (potentialRelevance < minRelevance) {
      break
    }
    if (ngrams2.includes(ngrams1[i])) {
      hitCount += 1
    }
  }

  if (hitCount > 0) {
    return (hitCount * 200.0) / union
  }

  return 0.0
}

let Search = function (spec) {
  let store = new Map()

  if (!_.isObject(spec)) { throw new Error('Spec must be an Object!') }

  for (let key of Object.keys(spec)) {
    spec[key] = {...defaultField, ...spec[key]}
  }

  let set = function (id, data = {}) {
    if (id == null) { throw new Error('Id is required') }

    let index = {}

    for (let [key, config] of Object.entries(spec)) {
      if (data[key] == null) {
        data[key] = ''
      }
      if (config.type === 'ngram') {
        index[key] = ngrams(data[key])
      }
    }

    return store.set(id, {
      data,
      index
    })
  }

  let unset = function (id) {
    if (id == null) { throw new Error('Id is required') }

    return store.delete(id)
  }

  let find = function (query, limit) {
    let queryNgrams = ngrams(query)
    let results = []

    for (let [id, record] of store.entries()) {
      let relevance = 0

      for (let [fieldName, fieldConfig] of Object.entries(spec)) {
        let fieldRelevance = 0
        let fieldValue = record.data[fieldName]

        if (fieldConfig.type === 'ngram') {
          let fieldNgrams = record.index[fieldName]

          if (query === fieldValue) { // Check for exact match
            fieldRelevance = 100
          } else if (fieldValue.includes(query)) { // Check for patial match
            fieldRelevance = (query.length / fieldValue.length) * 100
          } else { // Check for fuzzy match
            fieldRelevance = ngramMatch(queryNgrams, fieldNgrams)
          }
        }

        fieldRelevance = fieldRelevance * fieldConfig.boost

        relevance += fieldRelevance
      }

      if (results.length < limit && relevance > 0) {
        let data = record.data
        results.push({
          id,
          relevance,
          data
        })

        results = _.sortBy(results, ['relevance'])

        if (results.length > limit) {
          results.shift()
        }
      }
    }

    results.reverse()

    return results
  }

  return Object.freeze({
    set,
    unset,
    find
  })
}

module.exports = Search
