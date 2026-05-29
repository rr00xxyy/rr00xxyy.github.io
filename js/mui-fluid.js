(function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3)
  }

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback)
      return
    }

    callback()
  }

  function getCodeLanguage(figure) {
    var aliases = {
      bash: 'SH',
      c: 'C',
      cpp: 'C++',
      html: 'HTML',
      javascript: 'JS',
      js: 'JS',
      plaintext: 'TEXT',
      python: 'PY',
      rust: 'RS',
      shell: 'SH',
      ts: 'TS',
      typescript: 'TS',
      yaml: 'YAML'
    }

    var lang = Array.prototype.find.call(figure.classList, function (className) {
      return className !== 'highlight' && className !== 'mui-code-block'
    }) || 'code'

    return aliases[lang] || lang.toUpperCase()
  }

  function getCodeText(figure) {
    var code = figure.querySelector('td.code pre') || figure.querySelector('pre')
    return code ? code.innerText.replace(/\n+$/, '\n') : ''
  }

  function enhanceCodeBlocks() {
    document.querySelectorAll('figure.highlight').forEach(function (figure) {
      if (figure.querySelector('.mui-code-toolbar')) {
        return
      }

      figure.classList.add('mui-code-block')

      var toolbar = document.createElement('div')
      toolbar.className = 'mui-code-toolbar'
      toolbar.innerHTML =
        '<div class="mui-code-tabs"><span class="mui-code-tab">' + getCodeLanguage(figure) + '</span></div>' +
        '<div class="mui-code-actions">' +
          '<button class="mui-code-collapse" type="button" data-code-collapse>Collapse code</button>' +
          '<button type="button" data-code-copy aria-label="Copy code" title="Copy code">Copy</button>' +
        '</div>'

      var table = figure.querySelector('table')
      if (table && !table.parentElement.classList.contains('mui-code-scroll')) {
        var scrollWrap = document.createElement('div')
        scrollWrap.className = 'mui-code-scroll'
        figure.insertBefore(scrollWrap, table)
        scrollWrap.appendChild(table)
      }

      figure.insertBefore(toolbar, figure.firstChild)

      var collapseButton = toolbar.querySelector('[data-code-collapse]')
      var copyButton = toolbar.querySelector('[data-code-copy]')

      collapseButton.addEventListener('click', function () {
        var collapsed = figure.classList.toggle('is-collapsed')
        collapseButton.textContent = collapsed ? 'Expand code' : 'Collapse code'
      })

      copyButton.addEventListener('click', function () {
        var codeText = getCodeText(figure)

        function showCopied() {
          copyButton.textContent = 'Copied'
          window.setTimeout(function () {
            copyButton.textContent = 'Copy'
          }, 1200)
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codeText).then(showCopied).catch(function () {
            copyButton.textContent = 'Copy failed'
          })
          return
        }

        var textarea = document.createElement('textarea')
        textarea.value = codeText
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        showCopied()
      })
    })
  }

  function initDogShowcase() {
    var section = document.querySelector('.home-dog-showcase')
    if (!section) {
      return
    }

    var stage = section.querySelector('.dog-showcase-stage')
    var stageCopy = section.querySelector('.dog-stage-copy')
    var cards = Array.prototype.slice.call(section.querySelectorAll('.dog-card'))
    var frame = 0

    function update() {
      frame = 0

      var rect = section.getBoundingClientRect()
      var travel = Math.max(section.offsetHeight - window.innerHeight, 1)
      var progress = clamp((-rect.top + window.innerHeight * 0.08) / (travel * 1.02), 0, 1)
      var stageWidth = stage ? stage.offsetWidth : 1180
      var positionScale = clamp(stageWidth / 1180, 0.42, 1.08)

      if (stageCopy) {
        var copyScale = 1 - progress * 0.045
        stageCopy.style.opacity = String(clamp(1 - progress * 0.42, 0.58, 1))
        stageCopy.style.transform = 'translate(-50%, -50%) scale(' + copyScale + ')'
      }

      cards.forEach(function (card, index) {
        var delay = index * 0.045
        var localProgress = clamp((progress - delay) / 0.86, 0, 1)
        var eased = easeOutCubic(localProgress)
        var startX = Number(card.dataset.startX) * positionScale
        var startY = Number(card.dataset.startY) * positionScale
        var endX = Number(card.dataset.endX) * positionScale
        var endY = Number(card.dataset.endY) * positionScale
        var startRot = Number(card.dataset.startRot)
        var endRot = Number(card.dataset.endRot)
        var x = startX + (endX - startX) * eased
        var y = startY + (endY - startY) * eased
        var rotation = startRot + (endRot - startRot) * eased
        var scale = 0.72 + eased * 0.28

        card.style.opacity = String(clamp(0.08 + eased * 0.92, 0, 1))
        card.style.transform =
          'translate(-50%, -50%) translate3d(' + x + 'px, ' + y + 'px, 0) rotate(' +
          rotation + 'deg) scale(' + scale + ')'
      })
    }

    function requestUpdate() {
      if (frame) {
        return
      }

      frame = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    update()
  }

  function initFlowGallery() {
    var section = document.querySelector('.furry-flow-section')
    if (!section) {
      return
    }

    var viewport = section.querySelector('.flow-viewport')
    var tracks = Array.prototype.slice.call(section.querySelectorAll('.flow-track'))

    function updateFlowDistance() {
      if (!viewport) {
        return
      }

      var viewportWidth = viewport.clientWidth
      var edgePadding = Math.min(36, Math.max(18, viewportWidth * 0.025))

      tracks.forEach(function (track, index) {
        var overflow = Math.max(track.scrollWidth - viewportWidth, 0)
        var start = index % 2 === 0 ? edgePadding : -(overflow + edgePadding)
        var end = index % 2 === 0 ? -(overflow + edgePadding) : edgePadding

        track.style.setProperty('--flow-start', start + 'px')
        track.style.setProperty('--flow-end', end + 'px')
      })
    }

    updateFlowDistance()
    window.addEventListener('resize', updateFlowDistance)
    window.setTimeout(updateFlowDistance, 600)
    section.classList.add('is-flow-ready')
  }

  function initRevealGallery() {
    var section = document.querySelector('.furry-reveal-section')
    if (!section) {
      return
    }

    var stage = section.querySelector('.reveal-stage')
    var tiles = Array.prototype.slice.call(section.querySelectorAll('.reveal-tile'))
    var frame = 0

    function update() {
      frame = 0

      var rect = section.getBoundingClientRect()
      var travel = Math.max(section.offsetHeight - window.innerHeight, 1)
      var progress = clamp((-rect.top + window.innerHeight * 0.08) / (travel * 1.08), 0, 1)
      var stageWidth = stage ? stage.offsetWidth : 1180
      var positionScale = clamp(stageWidth / 1180, 0.48, 1.06)

      tiles.forEach(function (tile, index) {
        var delay = index * 0.08
        var localProgress = clamp((progress - delay) / 0.9, 0, 1)
        var eased = easeOutCubic(localProgress)
        var x = Number(tile.dataset.x) * positionScale * eased
        var y = Number(tile.dataset.y) * positionScale * eased
        var rotation = Number(tile.dataset.rot) * eased
        var scale = 0.74 + eased * 0.26
        var clip = 42 - eased * 42

        tile.style.opacity = String(clamp(eased * 1.08, 0, 1))
        tile.style.clipPath = 'inset(' + clip + '% round 28px)'
        tile.style.transform =
          'translate(-50%, -50%) translate3d(' + x + 'px, ' + y + 'px, 0) rotate(' +
          rotation + 'deg) scale(' + scale + ')'
      })
    }

    function requestUpdate() {
      if (frame) {
        return
      }

      frame = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    update()
  }

  onReady(function () {
    enhanceCodeBlocks()
    initDogShowcase()
    initFlowGallery()
    initRevealGallery()
  })
})()
