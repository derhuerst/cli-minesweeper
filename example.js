'use strict'

const minesweeper = require('.')

const m = minesweeper({size: 10})
.on('abort', () => process.exit(1))
