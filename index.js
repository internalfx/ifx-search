
let _ = require('lodash')

let buildMap = function (obj) {
  let map = new Map()
  for (let key of Object.keys(obj)) {
    map.set(key, obj[key])
  }
  return map
}

let ngrams = function (text) {
  let pieces = []

  text = text.toLowerCase().replace(/[^a-zA-Z0-9%@!$#?]+/g, '')
  for (let i = 0; i < text.length - 2; i += 1) {
    pieces.push(text.slice(i, i + 3))
  }
  return pieces
}

let ngramMatch = function (ngrams1, ngrams2, minRelevance) {
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

let Search = function () {
  let store = new Map()

  let set = function (id, text = '', data = {}) {
    if (id == null) { throw new Error('Id is required') }

    let record = buildMap({
      data: data,
      text: text,
      ngrams: ngrams(text)
    })

    return store.set(id, record)
  }

  let unset = function (id) {
    if (id == null) { throw new Error('Id is required') }

    return store.delete(id)
  }

  let find = function (text, limit) {
    let textNgrams = ngrams(text)
    let results = []
    let minRelevance = 0

    for (let record of store.values()) {
      let recordNgrams = record.get('ngrams')
      let relevance

      if (text === record.get('text')) {               // Check for exact match
        relevance = 100
      } else if (record.get('text').includes(text)) {  // Check for patial match
        relevance = (text.length / record.get('text').length) * 100
      } else {                                         // Check for fuzzy match
        relevance = ngramMatch(textNgrams, recordNgrams, minRelevance)
      }

      if (relevance > minRelevance || (results.length < limit && relevance > 0)) {
        let data = record.get('data')
        results.push({
          relevance,
          data
        })

        results = _.sortBy(results, ['relevance'])

        if (results.length > limit) {
          results.shift()
        }

        minRelevance = results[0].relevance
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
