#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const game = require('.')



const argv = yargs.argv

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    minesweeper [--size <value>]

Examples:
    minesweeper
    minesweeper --size 15
\n`)
	process.exit()
}

const size = +argv.size || 20

game({size})
.on('abort', () => process.exit(1))
