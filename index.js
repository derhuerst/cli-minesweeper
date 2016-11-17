'use strict'

const esc = require('ansi-escapes')
const chalk = require('chalk')
const wrap = require('prompt-skeleton')



const arr = (l, f) => new Array(l).fill(null).map(f)

const countAt = (size, mines, x, y) => {
	const s = size - 1
	let c = 0

	if (x > 0 && y > 0) c += mines[x - 1][y - 1] // top left
	if (y > 0)          c += mines[x    ][y - 1] // top center
	if (x < s && y > 0) c += mines[x + 1][y - 1] // top right
	if (x < s)          c += mines[x + 1][y    ] // center right
	if (x < s && y < s) c += mines[x + 1][y + 1] // bottom right
	if (y < s)          c += mines[x    ][y + 1] // bottom center
	if (x > 0 && y < s) c += mines[x - 1][y + 1] // bottom left
	if (x > 0)          c += mines[x - 1][y    ] // center left

	return c
}



const Minesweeper = {

	  moveCursor: function (x, y) {
		this.cursorX = x
		this.cursorY = y
	}



	, open: function () {
		let x = this.cursorX
		let y = this.cursorY

		if (this.opened[x][y]) return this.bell()
		if (this.mines[x][y]) return this.abort()
		this.opened[x][y] = true

		const queue = []
		const add = (x, y, dir) => {
			if (x < 0 || x >= this.mines.length
				|| y < 0 || y >= this.mines[0].length
				|| this.mines[x][y] || this.opened[x][y]) return
			queue.push([x, y, dir])
		}

		add(x, y-1, 'up')
		add(x+1, y, 'right')
		add(x, y+1, 'down')
		add(x-1, y, 'left')

		let item
		while (item = queue.pop()) {
			let [x, y, dir] = item
			this.opened[x][y] = true
			this.flagged[x][y] = false
			if (this.counts[x][y] === 0) {
				add(x, y-1, 'up')
				add(x+1, y, 'right')
				add(x, y+1, 'down')
				add(x-1, y, 'left')
			}
		}
	}

	, flag: function () {
		const x = this.cursorX
		const y = this.cursorY
		const isFlagged = !this.flagged[x][y]
		this.flagged[x][y] = isFlagged
		if (this.mines[x][y]) this.flaggedMines += isFlagged ? 1 : -1
		if (this.flaggedMines >= this.nrOfMines) return this.submit()
	}



	, abort: function () {
		this.done = this.aborted = true
		for (let y = 0; y < this.mines.length; y++) {
			for (let x = 0; x < this.mines[0].length; x++) {
				this.opened[x][y] = true
			}
		}
		this.emit()
		this.render()
		this.out.write('\n')
		this.close()
	}

	, submit: function () {
		this.done = true
		this.aborted = false
		this.emit()
		this.render()
		this.out.write('\n')
		this.close()
	}



	, up: function () {
		if (this.cursorY === 0) return this.bell()
		this.moveCursor(this.cursorX, this.cursorY - 1)
		this.render()
	}
	, down: function () {
		if (this.cursorY === (this.mines.length - 1)) return this.bell()
		this.moveCursor(this.cursorX, this.cursorY + 1)
		this.render()
	}
	, left: function () {
		if (this.cursorX === 0) return this.bell()
		this.moveCursor(this.cursorX - 1, this.cursorY)
		this.render()
	}
	, right: function () {
		if (this.cursorX === (this.mines[0].length - 1)) return this.bell()
		this.moveCursor(this.cursorX + 1, this.cursorY)
		this.render()
	}

	, _: function (c) { // on space key
		if (c === ' ') {
			this.open()
			this.render()
		} else if (c === 'f') {
			this.flag()
			this.render()
		} else this.bell()
	}



	, renderChoice: function (choice, indent, selected) {
		return ' '.repeat(+indent)
		+ chalk.gray(ui.item(Array.isArray(choice.children), choice.expanded)) + ' '
		+ (selected ? chalk.cyan.underline(choice.title) : choice.title)
		+ '\n'
	}

	, renderChoices: function (choices, selected, indent = 0, offset = 0) {
		let out = ''
		for (let choice of choices) {
			out += this.renderChoice(choice, indent, offset === selected)
			offset++
			if (Array.isArray(choice.children)) {
				if (choice.expanded)
					out += this.renderChoices(choice.children, selected, indent + 4, offset)
				offset += choice.children.length
			}
		}
		return out
	}

	, render: function (first) {
		const isGameOver = this.aborted

		// todo: re-render only necessary parts
		let out = (isGameOver ? '😵 ' : '😬 ') + chalk.gray(` ${this.nrOfMines} mines\n`)
		for (let y = 0; y < this.mines.length; y++) {
			for (let x = 0; x < this.mines[0].length; x++) {

				const isFlagged = this.flagged[x][y]
				const isOpened = this.opened[x][y]
				const isMine = this.mines[x][y]
				const isSelected = x === this.cursorX && y === this.cursorY
				const count = this.counts[x][y]
				let cell

				if (isFlagged && !isGameOver) cell = '🚩'
				else if (!isOpened)   cell = chalk.gray('?')
				else if (isMine)      cell = isSelected ? '💥' : '💣'
				else if (count === 1) cell = chalk.blue(count)
				else if (count === 2) cell = chalk.green(count)
				else if (count === 3) cell = chalk.yellow(count)
				else if (count === 4) cell = chalk.red(count)
				else if (count > 4)   cell = chalk.bold.red(count)
				else                  cell = ' '

				out += isSelected ? chalk.bgWhite.bold(cell) : cell
				out += ' '
			}
			out += '\n'
		}

		if (first) this.out.write(esc.cursorHide + out)
		else this.out.write(esc.eraseLines(this.mines.length + 2) + out)
	}
}



const defaults = {
	  size: 10
}

const minesweeper = (opt) => {
	if (Array.isArray(opt) || 'object' !== typeof opt) opt = {}

	let nrOfMines = 0
	const mines = arr(opt.size, () => arr(opt.size, () => {
		const isMine = Math.random() <= .15
		if (isMine) nrOfMines++
		return isMine
	}))
	const opened = arr(opt.size, () => arr(opt.size, () => false))
	const flagged = arr(opt.size, () => arr(opt.size, () => false))

	const counts = arr(opt.size, () => arr(opt.size, () => 0))
	for (let y = 0; y < mines.length; y++) {
		for (let x = 0; x < mines[0].length; x++) {
			counts[x][y] = countAt(opt.size, mines, x, y)
		}
	}

	let m = Object.assign(Object.create(Minesweeper), {
		value: null, done: false, aborted: false,
		nrOfMines, mines, flaggedMines: 0, flagged,
		opened, counts, cursorX: 0, cursorY: 0, size: opt.size
	})

	return wrap(m)
}



module.exports = Object.assign(minesweeper, {Minesweeper})
