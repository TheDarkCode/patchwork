var { h, resolve, computed, when, map, send, Value, Struct } = require('mutant')
var nest = require('depnest')
var extend = require('xtend')

// TODO: should this be provided by scuttle-poll? I _think_ so.
var { isPosition, isChooseOnePosition, parseChooseOnePoll, parseChooseOnePosition } = require('ssb-poll-schema')
var Poll = require('scuttle-poll')

exports.needs = nest({
  'message.html.markdown': 'first',
  'message.html.layout': 'first',
  'message.html.decorate': 'reduce',
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'about.html.image': 'first',
  'about.obs.latestValue': 'first',
  'about.obs.groupedValues': 'first',
  'about.obs.valueFrom': 'first',
  'about.obs.name': 'first',
  'contact.obs.following': 'first',
  'blob.sync.url': 'first',
  'sbot.obs.connection': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html', {
  canRender: true,
  render: true
})

exports.create = function (api) {
  var mdRenderer = markdown
  var i18n = api.intl.sync.i18n
  var avatar = (feed) => {
    return h('a.avatar', {href: `${feed}`}, [
      api.about.html.image(feed)
    ])
  }
  var name = api.about.obs.name
  var timeago = defaultTimeago

  return nest('message.html', {
    canRender: isPosition,
    render: function (msg, opts = {}) {
      if (!isPosition(msg)) return
      var scuttlePoll = Poll(api.sbot.obs.connection)

      var position
      if (isChooseOnePosition) { position = parseChooseOnePosition(msg) }

      var choice = Value('')

      scuttlePoll.poll.async.get(msg.dest, function (err, poll) {
        if (!err) {
          const { details: {choices} } = parseChooseOnePoll(poll)
          if (position.details.choice >= choices.length || position.details.choice < 0) {
            choice.set(i18n('Invalid choice selected.'))
          }
          choice.set(choices[position.details.choice])
        }
      })

      function Position ({ msg, avatar, timeago, name, mdRenderer }) {
        // postion, reason, time, avatar, name
        return h('PollPosition', [
          h('div.choice', [h('div', i18n('Voted: ')), h('div.choiceName', choice)]),
          h('div.reason', [h('div', i18n('Reason: ')), h('div', mdRenderer(position.reason || ' '))])
        ])
      }

      var content = Position({msg, avatar, timeago, name, mdRenderer})

      var element = api.message.html.layout(msg, extend({
        content,
        miniContent: i18n('Added a position'),
        layout: 'mini'
      }, opts))

      return element
    }
  })

  function markdown (obs) {
    return computed(obs, (text) => {
      if (typeof text === 'string') return api.message.html.markdown(text)
    })
  }
}

function defaultTimeago (time) {
  return new Date(time).toISOString().substr(0, 10)
}
