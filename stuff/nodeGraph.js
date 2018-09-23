/*
	-- Quick and dirty saving system --

	if (B.keysPress.s) {
		B.createForm(null, [{
			name: "Save Graph",
			type: "none"
		}, {
			id: "name",
			name: "Name",
			value: "New Node Graph",
			type: "text"
		}], "Save", true).then(({ name }) => {
			B.l.saved[name] = editor.serialize()
		})
	}

	if (B.keysPress.l) {
		B.createForm(null, [{
			name: "Load Graph",
			type: "none"
		}, {
			id: "name",
			name: "Name",
			type: "selection",
			value: B.l.saved.toArray().map(v => v.key)[0],
			options: B.l.saved.toArray().map(v => v.key)
		}], "Load", true).then(({ name }) => {
			editor.deserialize(B.l.saved[name])
		})
	}
*/


B.module.require("canvas")
B.module.init("nodeGraph", 0, ["canvas"], () => {
	var drawQueue = Symbol("drawQueue")
	var constantTemplate = {
		name: "constant",
		localizedName: "ERROR",
		code: "throw 'wat?'",
		codeGenerator: null,
		generatorTypesSupported: null,
		inputs: [],
		outputs: (type) => [[type, "Error"]]
	}
	data = {}
	data.NodeGraph = function NodeGraph(ctx, masterNodeInputs, { bgColor = colors.notepad, nodeColor = colors.grey, autocompile = true, onRecompile = () => { }, nodeFontSize = 12, nodeFont = "Consolas",
		nodeLineHeight = 14, nodeSegmentColor = colors.voidGrey, nodeTextColor = colors.white, nodeHeaderColor = colors.darkGrey } = {}) {

		Object.assign(this, {
			bgColor, nodeColor, autocompile, ctx, nodeFontSize, nodeFont, nodeLineHeight, nodeSegmentColor, nodeTextColor, nodeHeaderColor,
			viewPos: [0, 0],
			zoom: 1,
			nodes: [],
			contextMenu: null,
			nodeTemplates: {},
			types: {},
			compiledCode: "() => { throw 'No code compiled' }",
			compiledCodeDirty: false,
			onRecompile,
			[drawQueue]: {}
		})
		var lastMiddle = null
		var lastLeft = null
		var leftSelectedNode = null
		var leftSelectedConnector = null

		this.nodes.push({
			pos: [0, 0],
			template: {
				name: "masterNode",
				localizedName: "Master Node",
				code: "throw 'wat? 2'",
				codeGenerator: null,
				generatorTypesSupported: null,
				inputs: masterNodeInputs,
				outputs: [],
				indeletable: true
			},
			genericType: null,
			inputs: Array.getFilled(masterNodeInputs.length, null),
			outputs: [],
			isConstant: false,
			constant: null,
			indeletable: true,
			isMasterMode: true
		})

		ctx.canvas.canvas.addEventListener("mousedown", (event => {
			if (event.button == 0) {
				if (this.contextMenu && this.contextMenu.getRect().testPoint(event.getPos())) {
					this.contextMenu.click(event.getPos(), this)
				} else {
					lastLeft = this.inverseTranfrom(event.getPos())
					leftSelectedConnector = this.getConnectorAtPos(lastLeft)
					if (!leftSelectedConnector) {
						leftSelectedNode = this.getNodeAtPos(lastLeft)
						if (!leftSelectedNode) {
							lastLeft = null
						}
					} else {
						leftSelectedConnector[0].inputs[leftSelectedConnector[1]] = null
						this.compiledCodeDirty = true
					}
					this.contextMenu = null
				}
			}
			if (event.button == 1) {

				lastMiddle = this.inverseTranfrom(event.getPos())
				this.contextMenu = null
			}
			if (event.button == 2) {
				if (leftSelectedConnector) {
					var type = leftSelectedConnector[2]
					if (type.hasConstant) {
						var obj = typeof type.def == "object" ? type.def.copy() : { "": type.def }
						var copy = leftSelectedConnector
						B.formify(null, obj, "OK", false, (obj) => {
							var value = typeof type.def == "object" ? (type.def instanceof Array ? obj.toArray().map(v => v.value) : obj) : obj[""]
							//var value = type.parseConstant(entry)
							var index = this.nodes.push({
								pos: this.inverseTranfrom(event.getPos()),
								template: constantTemplate,
								genericType: type.name,
								inputs: [],
								outputs: [null],
								isConstant: true,
								constant: value
							})
							var constantNode = this.nodes[index - 1]

							copy[0].inputs[copy[1]] = [constantNode, 0]

							this.compiledCodeDirty = true


						}, true)
						B.modalWindow.parentElement.addEventListener("contextmenu", (e) => e.preventDefault())
					}
					lastLeft = null
					leftSelectedConnector = null
					delete this[drawQueue].cursorLine
				} else {
					this.openContextMenu(event.getPos())
					let node = this.getNodeAtPos(this.inverseTranfrom(event.getPos()))
					if (node) {
						this.contextMenu = data.NodeGraph.ContextMenu.makeDeleteOffer(event.getPos(), node)
					}
				}
			}
		}))
		ctx.canvas.canvas.addEventListener("mouseup", (event => {
			if (event.button == 0) {
				if (leftSelectedConnector) {
					var second = this.getOutputConnectorAtPos(this.inverseTranfrom(event.getPos()))
					if (second) {
						var outputType = second[2]
						var inputType = leftSelectedConnector[2]
						var typesCompatible = inputType.name == outputType.name

						if (!typesCompatible) {
							if (inputType.name in outputType.convertTo || outputType.name in inputType.convertFrom) {
								typesCompatible = true
							}
						}

						if (typesCompatible) {
							leftSelectedConnector[0].inputs[leftSelectedConnector[1]] = second
							this.compiledCodeDirty = true
						}
					}
				}
				lastLeft = null; leftSelectedNode = null; leftSelectedConnector = null; delete this[drawQueue].cursorLine
			}
			if (event.button == 1) { lastMiddle = null }
		}))
		ctx.canvas.canvas.addEventListener("mousemove", (event => {
			if (lastLeft) {
				if (leftSelectedNode) {
					var newPos = this.inverseTranfrom(event.getPos())
					var diff = newPos.add(lastLeft.mul(-1))
					leftSelectedNode.pos = leftSelectedNode.pos.add(diff)
					lastLeft = this.inverseTranfrom(event.getPos())
				} else if (leftSelectedConnector != null) {
					this[drawQueue].cursorLine = (() => this.drawConnection(this.inverseTranfrom(event.getPos()), this.getConnectorPos(leftSelectedConnector[0], leftSelectedConnector[1]), leftSelectedConnector[2].color))
				}
			}
			if (lastMiddle) {
				var newPos = this.inverseTranfrom(event.getPos())
				var diff = newPos.add(lastMiddle.mul(-1))
				this.viewPos = this.viewPos.add(diff.mul(-1))
				lastMiddle = this.inverseTranfrom(event.getPos())
			}
		}))
		ctx.canvas.canvas.addEventListener("contextmenu", (event) => {
			event.preventDefault()
		})
		ctx.canvas.canvas.addEventListener("wheel", (event) => {
			this.zoom += event.deltaY / -1000
			this.zoom = this.zoom.clamp(0.1, 1)
		}, { passive: true })
	}
	data.NodeGraph.prototype = {
		transform(pos) {
			var diff = pos.add(this.viewPos.mul(-1))
			var dir = diff.normalize()
			var size = diff.size()
			return dir.mul(size * this.zoom).add(this.ctx.getSize().mul(0.5)).floor()
		},
		inverseTranfrom(pos) {
			var diff = pos.add(this.ctx.getSize().mul(0.5).mul(-1))
			var dir = diff.normalize()
			var size = diff.size()
			return dir.mul(size / this.zoom).add(this.viewPos)
		},
		transformSize(size) {
			return size.mul(this.zoom)
		},
		registerType(name, localizedName, color, def = "0", hasConstant = false, convertTo = {}, convertFrom = {}, bgColor = color.mul(0.25)) {
			this.types[name] = {
				name, color, localizedName, bgColor, convertTo, convertFrom, def, hasConstant
			}
		},
		apply(prefab) {
			prefab(this)
		},
		compile(force = this.compiledCodeDirty) {
			if (!force) {
				return this.compiledCode
			} else {
				// TODO: Compile code



				var compiledNodes = []
				var blocks = [
					"(__args) => {",
					"	// Code autogenerated by nodeGraph.js by bt7s7k7",
					"	var __values = []",
					"	var __ret = []",
					""
				]
				var compileNode = (node) => {
					var id = this.nodes.indexOf(node).assert((v) => v != -1, "Node not present in array")
					if (compiledNodes.indexOf(node) != -1) return
					node.inputs.forEach((v) => {
						if (v != null) {
							compileNode(v[0])
						}
					})

					node.inputs.forEach((v) => {
						if (v != null && compiledNodes.indexOf(v[0]) == -1) {
							throw ["Node ", v[0], " failed to compile"]
						}
					})

					var code = "\n// Node ID: " + id + "\n__values[" + id + "] = []\n"

					if (node.isConstant) {
						code += "__values[" + id + "][0] = " + JSON.stringify(node.constant)
					} else {
						let inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => this.types[v[0]])
						let inputValues = node.inputs.map((v, i) => {
							if (v == null) {
								return JSON.stringify(inputTypes[i].def)
							} else {
								var outputType = this.types[(typeof v[0].template.outputs == "function" ? v[0].template.outputs(v[0].genericType) : v[0].template.outputs)[v[1]][0]]
								if (inputTypes[i] == outputType) return "__values[" + this.nodes.indexOf(v[0]) + "][" + v[1] + "]"
								else {
									if (outputType.name in inputTypes[i].convertFrom) return "(" + inputTypes[i].convertFrom[outputType.name].replace(/\$INPUT/g, "__values[" + this.nodes.indexOf(v[0]) + "][" + v[1] + "]") + ")"
									else if (inputTypes[i].name in outputType.convertTo) return "(" + outputType.convertTo[inputTypes[i].name].replace(/\$INPUT/g, "__values[" + this.nodes.indexOf(v[0]) + "][" + v[1] + "]") + ")"
									else throw new Error("Types incompatible")
								}
							}
						})
						if (node.isMasterMode) {
							code += "__ret = [" + inputValues.join(", ") + "]"
						} else {
							let rawCode = (node.template.code ? node.template.code : node.template.codeGenerator(node.genericType))
							rawCode = rawCode.replace(/\$RETURN/g, "__values[" + id + "]")
							inputValues.forEach((v, i) => {
								var char = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]
								rawCode = rawCode.replace(eval("/\\$" + char + "/g"), v).replace(eval("/\\$\\?" + char + "/g"), node.inputs[i] != null)
							})
							code += "{\n" + rawCode + "\n}"
						}
					}

					blocks.push(code)

					compiledNodes.push(node)
				}

				compileNode(this.nodes.filter(v => v.isMasterMode)[0])

				blocks.push("", "	return __ret", "}")
				this.compiledCode = blocks.join("\n")

				this.onRecompile(this.compiledCode)
				this.compiledCodeDirty = false
				return this.compiledCode
			}
		},
		openContextMenu(pos, settings) {
			this.contextMenu = new data.NodeGraph.ContextMenu(pos, this, settings)
		},
		update() {
			this.ctx.setColor(this.bgColor).fill()
			var ctx = this.ctx
			ctx.setColor(colors.white.add(this.bgColor.mul(-1))).ellipse(this.transform(this.nodes[0].pos).clamp([0, 0], ctx.getSize()), [5, 5])
			//TODO: Finish node line rendering
			for (node of this.nodes) {
				for ([v, i] of FL.forEach(node.inputs)) {
					if (v) {
						var type = this.types[(typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs)[i][0]]
						var targetNode = v[0]
						var targetType = this.types[(typeof targetNode.template.outputs == "function" ? targetNode.template.outputs(targetNode.genericType) : targetNode.template.outputs)[v[1]][0]]
						var mineConnectorPos = this.getConnectorPos(node, i)
						var targetConnectorPos = this.getOutputConnectorPos(targetNode, v[1])

						this.drawConnection(targetConnectorPos, mineConnectorPos, targetType.color, type.color)
					}
				}
			}

			this[drawQueue].toArray().forEach(v => v.value())
			//TODO: Finish node rendering
			for (node of this.nodes) {
				var height = 1 + this.nodeLineHeight + 1 + this.nodeLineHeight * node.inputs.length + 1 + this.nodeLineHeight * node.outputs.length + 1
				var width = ctx.measureText(this.nodeFontSize * this.zoom, node.isConstant ? this.types[node.genericType].localizedName : node.template.localizedName, this.nodeFont).width
				var inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => [this.types[v[0]], v[1]])
				var outputTypes = (typeof node.template.outputs == "function" ? node.template.outputs(node.genericType) : node.template.outputs).map(v => [this.types[v[0]], v[1]]);
				[...inputTypes, ...outputTypes].forEach(v => {
					var mwidth = ctx.measureText(this.nodeFontSize * this.zoom, node.isConstant ? JSON.stringify(node.constant) : v[1], this.nodeFont).width
					if (mwidth > width) {
						width = mwidth
					}
				})
				width += 22
				ctx.setColor(this.nodeColor).box(this.transform(node.pos.add([-1, -1])), this.transformSize([width, height]))
				ctx.setColor(this.nodeHeaderColor).box(this.transform(node.pos), this.transformSize([width - 2, this.nodeLineHeight]))
					.setColor(this.nodeTextColor).text(this.transform(node.pos).add(this.transformSize([width - 2, this.nodeLineHeight].mul(0.5))), this.nodeFontSize * this.zoom, node.isConstant ? this.types[node.genericType].localizedName : node.template.localizedName, true, this.nodeFont);
				[...inputTypes, ...outputTypes].forEach((v, i) => {
					var offset = this.nodeLineHeight + 1
					if (i >= inputTypes.length) offset += 1
					ctx.setColor(this.nodeSegmentColor).box(this.transform(node.pos.add([0, offset + this.nodeLineHeight * i])), this.transformSize([width - 2, this.nodeLineHeight]))
						.setColor(this.nodeTextColor).text(this.transform(node.pos.add([0, offset + this.nodeLineHeight * i])).add(this.transformSize([width - 2, this.nodeLineHeight].mul(0.5))), this.nodeFontSize * this.zoom, node.isConstant ? JSON.stringify(node.constant) : v[1], true, this.nodeFont);
					var x = i >= inputTypes.length ? width : -1 - this.nodeLineHeight / 2
					x += node.pos[0]
					var y = offset + this.nodeLineHeight * i + this.nodeLineHeight / 4 + node.pos[1]
					ctx.setColor(v[0].color).box(this.transform([x, y]), this.transformSize([1, 1].mul(this.nodeLineHeight / 2)))
				})
			}

			if (this.contextMenu) {
				this.contextMenu.draw(this.ctx, this)
			}

			if (this.autocompile) {
				this.compile()
			}
		},
		registerNodeTemplate(category, name, localizedName, code, types) {
			if (!(category in this.nodeTemplates)) this.nodeTemplates[category] = {}
			this.nodeTemplates[category][name] = {
				name, localizedName,
				code: typeof code == "string" ? code : null,
				codeGenerator: typeof code == "object" ? code.generator : null,
				generatorTypesSupported: typeof code == "object" ? code.supported : null,
				inputs: types[0],
				outputs: types[1]
			}
		},
		spawnNode(pos, template, genericType = null) {
			var inputLength = typeof template.inputs == "function" ? template.inputs(genericType).length : template.inputs.length
			var outputLength = typeof template.outputs == "function" ? template.outputs(genericType).length : template.outputs.length
			this.nodes.push({
				pos, template, genericType,
				inputs: Array.getFilled(inputLength, null),
				outputs: Array.getFilled(outputLength, null),
				isConstant: false,
				constant: null
			})
			this.compiledCodeDirty = true
		},
		getNodeAtPos(pos) {
			for (node of this.nodes) {
				var height = 1 + this.nodeLineHeight + 1 + this.nodeLineHeight * node.inputs.length + 1 + this.nodeLineHeight * node.outputs.length + 1
				var width = this.ctx.measureText(this.nodeFontSize * this.zoom, node.template.localizedName, this.nodeFont).width
				var inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => [this.types[v[0]], v[1]])
				var outputTypes = (typeof node.template.outputs == "function" ? node.template.outputs(node.genericType) : node.template.outputs).map(v => [this.types[v[0]], v[1]]);
				[...inputTypes, ...outputTypes].forEach(v => {
					var mwidth = this.ctx.measureText(this.nodeFontSize * this.zoom, v[1], this.nodeFont).width
					if (mwidth > width) {
						width = mwidth
					}
				})
				width += 22
				if (shapes.rect(node.pos, [width, height]).testPoint(pos)) {
					return node
				}
			}
			return null
		},
		getConnectorAtPos(pos) {
			var ctx = this.ctx
			for (node of this.nodes) {
				var height = 1 + this.nodeLineHeight + 1 + this.nodeLineHeight * node.inputs.length + 1 + this.nodeLineHeight * node.outputs.length + 1
				var width = ctx.measureText(this.nodeFontSize * this.zoom, node.template.localizedName, this.nodeFont).width
				var inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => [this.types[v[0]], v[1]])
				var outputTypes = (typeof node.template.outputs == "function" ? node.template.outputs(node.genericType) : node.template.outputs).map(v => [this.types[v[0]], v[1]]);
				[...inputTypes, ...outputTypes].forEach(v => {
					var mwidth = ctx.measureText(this.nodeFontSize * this.zoom, v[1], this.nodeFont).width
					if (mwidth > width) {
						width = mwidth
					}
				})
				width += 22;
				for ([v, i] of FL.forEach(inputTypes)) {
					var offset = this.nodeLineHeight + 1
					var x = i >= inputTypes.length ? width : -1 - this.nodeLineHeight / 2
					x += node.pos[0]
					var y = offset + this.nodeLineHeight * i + this.nodeLineHeight / 4 + node.pos[1]
					if (shapes.rect([x, y], [1, 1].mul(this.nodeLineHeight / 2)).testPoint(pos)) {
						return [node, i, v[0]]
					}
				}
			}
			return null
		},
		getOutputConnectorAtPos(pos) {
			var ctx = this.ctx
			for (node of this.nodes) {
				var height = 1 + this.nodeLineHeight + 1 + this.nodeLineHeight * node.inputs.length + 1 + this.nodeLineHeight * node.outputs.length + 1
				var width = ctx.measureText(this.nodeFontSize * this.zoom, node.isConstant ? this.types[node.genericType].localizedName : node.template.localizedName, this.nodeFont).width
				var inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => [this.types[v[0]], v[1]])
				var outputTypes = (typeof node.template.outputs == "function" ? node.template.outputs(node.genericType) : node.template.outputs).map(v => [this.types[v[0]], v[1]]);
				[...inputTypes, ...outputTypes].forEach(v => {
					var mwidth = ctx.measureText(this.nodeFontSize * this.zoom, node.isConstant ? JSON.stringify(node.constant) : v[1], this.nodeFont).width
					if (mwidth > width) {
						width = mwidth
					}
				})
				width += 22;
				for ([v, i] of FL.forEach(outputTypes)) {
					i += inputTypes.length
					var offset = this.nodeLineHeight + 2
					var x = i >= inputTypes.length ? width : -1 - this.nodeLineHeight / 2
					x += node.pos[0]
					var y = offset + this.nodeLineHeight * i + this.nodeLineHeight / 4 + node.pos[1]
					if (shapes.rect([x, y], [1, 1].mul(this.nodeLineHeight / 2)).testPoint(pos)) {
						return [node, i - inputTypes.length, v[0]]
					}
				}
			}
			return null
		},
		getConnectorPos(node, i) {
			var ctx = this.ctx
			var height = 1 + this.nodeLineHeight + 1 + this.nodeLineHeight * node.inputs.length + 1 + this.nodeLineHeight * node.outputs.length + 1
			var width = ctx.measureText(this.nodeFontSize * this.zoom, node.template.localizedName, this.nodeFont).width
			var inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => [this.types[v[0]], v[1]])
			var outputTypes = (typeof node.template.outputs == "function" ? node.template.outputs(node.genericType) : node.template.outputs).map(v => [this.types[v[0]], v[1]]);
			[...inputTypes, ...outputTypes].forEach(v => {
				var mwidth = ctx.measureText(this.nodeFontSize * this.zoom, v[1], this.nodeFont).width
				if (mwidth > width) {
					width = mwidth
				}
			})
			width += 22;
			var offset = this.nodeLineHeight + 1
			var x = i >= inputTypes.length ? width : -1 - this.nodeLineHeight / 2
			x += node.pos[0]
			var y = offset + this.nodeLineHeight * i + this.nodeLineHeight / 4 + node.pos[1]
			return [x, y].add([1, 1].mul(this.nodeLineHeight / 4))
		},
		getOutputConnectorPos(node, i) { //@@@ getOutputConnectorPos
			var ctx = this.ctx
			var height = 1 + this.nodeLineHeight + 1 + this.nodeLineHeight * node.inputs.length + 1 + this.nodeLineHeight * node.outputs.length + 1
			var width = ctx.measureText(this.nodeFontSize * this.zoom, node.isConstant ? this.types[node.genericType].localizedName : node.template.localizedName, this.nodeFont).width
			var inputTypes = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).map(v => [this.types[v[0]], v[1]])
			var outputTypes = (typeof node.template.outputs == "function" ? node.template.outputs(node.genericType) : node.template.outputs).map(v => [this.types[v[0]], v[1]]);
			[...inputTypes, ...outputTypes].forEach(v => {
				var mwidth = ctx.measureText(this.nodeFontSize * this.zoom, node.isConstant ? JSON.stringify(node.constant) : v[1], this.nodeFont).width
				if (mwidth > width) {
					width = mwidth
				}
			})
			width += 22;
			i += inputTypes.length
			var offset = this.nodeLineHeight + 2
			var x = i >= inputTypes.length ? width : -1 - this.nodeLineHeight / 2
			x += node.pos[0]
			var y = offset + this.nodeLineHeight * i + this.nodeLineHeight / 4 + node.pos[1]
			return [x, y].add([1, 1].mul(this.nodeLineHeight / 4))
		},
		removeNode(toDelete) {
			if (toDelete.template.indeletable) return
			for (node of this.nodes) {
				if (toDelete == node) continue
				for ([v, i, a] of FL.forEach(node.inputs)) {
					if (v == null) continue
					if (v[0] == toDelete) {
						a[i] = null
					}
				}
			}
			this.nodes.splice(this.nodes.indexOf(toDelete), 1)
			this.compiledCodeDirty = true
		},
		drawConnection(output, input, ocolor, icolor = ocolor) {
			var width = this.nodeLineHeight / 8 * this.zoom
			var begin = output.add([30, 0])
			var end = input.add([-30, 0])
			this.ctx.setColor(this.bgColor).line(this.transform(output), this.transform(begin), width * 3).line(this.transform(end), this.transform(input), width * 3).line(this.transform(begin), this.transform(end), width * 3)
			this.ctx.setColor(ocolor).line(this.transform(output), this.transform(begin), width)
			var formatedOColor = this.ctx.canvas.strokeStyle
			this.ctx.setColor(icolor).line(this.transform(end), this.transform(input), width)
			var formatedIColor = this.ctx.canvas.strokeStyle
			var gradient = this.ctx.canvas.createLinearGradient(...this.transform(begin), ...this.transform(end))
			gradient.addColorStop(0, formatedOColor)
			gradient.addColorStop(1, formatedIColor)
			this.ctx.setColor(gradient).line(this.transform(begin), this.transform(end), width)
		},
		serialize() { //@@@serialization
			var serializedNodes = []
			var findTemplatePath = (template) => {
				if (template == constantTemplate) return null
				for ([category] of FL.forEach(this.nodeTemplates.toArray())) {
					for ([nTemplate] of FL.forEach(category.value.toArray())) {
						if (nTemplate.value == template) {
							return [category.key, nTemplate.key]
						}
					}
				}
				throw ["Was unable to find template path for: ", template]
			}
			for ([v, i] of FL.forEach(this.nodes)) {
				serializedNodes[i] = {
					pos: v.pos,
					template: v.isMasterMode ? null : findTemplatePath(v.template),
					genericType: v.genericType,
					inputs: v.inputs.map(v => v == null ? null : [this.nodes.indexOf(v[0]).assert((v) => v >= 0, "Invalid node link").valueOf(), v[1]]),
					outputs: v.outputs,
					isConstant: v.isConstant,
					constant: v.constant,
					indeletable: v.indeletable,
					isMasterMode: v.isMasterMode
				}
			}

			return JSON.stringify(serializedNodes)

		},
		deserialize(source) {
			//TODO: Deserialization process
			var deserializedNodes = JSON.parse(source)
			var masterNodeTemplate = this.nodes.toArray().filter(v => v.value.isMasterMode)[0].value.template
			if (!(deserializedNodes instanceof Array)) throw new Error("Source object is not an array")
			var backup = this.nodes.copy()
			try {
				this.nodes.length = 0
				for ([v, i] of FL.forEach(deserializedNodes)) {
					this.nodes[i] = {
						pos: v.pos,
						template: v.template ? this.nodeTemplates[v.template[0]][v.template[1]] : (v.isMasterMode ? masterNodeTemplate : (v.isConstant ? constantTemplate : undefined)),
						genericType: v.genericType,
						inputs: v.inputs,
						outputs: v.outputs,
						isConstant: v.isConstant,
						constant: v.constant,
						indeletable: v.indeletable,
						isMasterMode: v.isMasterMode
					}
				}

				for ([node] of FL.forEach(this.nodes)) {
					for ([inp, vi] of FL.forEach(node.inputs)) {
						node.inputs[vi] = inp == null ? null : [this.nodes[inp[0]].assert((v) => v, new Error("Failed to find node at index " + inp[0])), inp[1]]
					}
					node.inputs.length = (typeof node.template.inputs == "function" ? node.template.inputs(node.genericType) : node.template.inputs).length
				}

				if (this.nodes.toArray().filter(v => v.value.isMasterMode).length != 1) {
					throw new Error("Invalid amount of master nodes in source object")
				}

				this.compiledCodeDirty = true

			} catch (err) {
				this.nodes = backup
				throw err
			}
		}
	}
	Object.assign(data.NodeGraph, {
		/*
			Include all:

			NodeGraph.prefabs.numbers(graph)
			NodeGraph.prefabs.logic(graph)
			NodeGraph.prefabs.trigonometry(graph)
			NodeGraph.prefabs.string(graph)
			NodeGraph.prefabs.color(graph)
			NodeGraph.prefabs.vector(graph)
			NodeGraph.prefabs.meta(graph)

		*/
		prefabs: { //@@@ prefabs
			numbers: (graph) => {
				graph.registerType("number", "Number", colors.white, 0, true)
				graph.registerNodeTemplate("Numbers", "add", "+", "$RETURN = [$A + $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "substract", "-", "$RETURN = [$A - $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "multiply", "*", "$RETURN = [$A * $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "divide", "/", "$RETURN = [$A / $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "modulo", "%", "$RETURN = [$A % $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Math Functions", "floor", "Floor", "$RETURN = [Math.floor($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Math Functions", "ceil", "Ceil", "$RETURN = [Math.ceil($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Math Functions", "abs", "Absolute", "$RETURN = [Math.abs($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Numbers", "invert", "Invert", "$RETURN = [Math.abs($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Math Prefabs", "oneMinus", "1 -", "$RETURN = [1 - ($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Numbers", "power", "Power", "$RETURN = [$A & $B]", [[["number", "Input"], ["number", "Power"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "slope", "Slope", "$RETURN = [$A > $B ? Infinity : -Infinity]", [[["number", "Input"], ["number","Threshold"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Math Prefabs", "multiplyAndModulo1", "* % 1", "$RETURN = [($A * $B) % 1]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Math Prefabs", "multiply2Sub1", "* 2 - 1", "$RETURN = [$A * 2 - 1]", [[["number", "In"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Math Prefabs", "multiply-1", "* -1", "$RETURN = [$A * -1]", [[["number", "In"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "bitwiseAnd", "&", "$RETURN = [$A & $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "bitwiseOr", "|", "$RETURN = [$A | $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Numbers", "bitwiseXor", "^", "$RETURN = [$A ^ $B]", [[["number", "A"], ["number", "B"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Math Functions", "map", "Map", "$RETURN = [Math.map($A,$B,$C,$D,$E)]", [[["number", "Number"], ["number", "I Min"], ["number", "I Max"], ["number", "O Min"], ["number", "O Max"]], [["number", "Out"]]])
				graph.registerNodeTemplate("Math Functions", "random", "Random", "$RETURN = [Math.random(1,false)]",[[],[["number","Output"]]])
			},
			logic: (graph) => {
				graph.registerType("bool", "Boolean", colors.orange, false, true, { "number": "$INPUT ? 1 : 0" }, { "number": "$INPUT != 0" })
				graph.registerNodeTemplate("Logic", "true", "True", "$RETURN = [true]", [[], [["bool", ""]]])
				graph.registerNodeTemplate("Logic", "not", "!", "$RETURN = [!$A]", [[["bool", "In"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "and", "&&", "$RETURN = [$A && $B]", [[["bool", "A"], ["bool", "B"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "or", "||", "$RETURN = [$A || $B]", [[["bool", "A"], ["bool", "B"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "xor", "(+)", "$RETURN = [$A != $B]", [[["bool", "A"], ["bool", "B"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "equals", "==", {
					generator: (type) => type == "vector" ? "$RETURN = [$A.equals($B)]" : "$RETURN = [$A == $B]",
					supported: ["number", "bool", "string"]
				}, [(type) => { return [[type, "A"], [type, "B"]] }, [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "ternary", "?:", {
					generator: () => "$RETURN = $A ? $B : $C",
					supported: ["number", "bool", "string"]
				}, [(type) => { return [["bool", "Choice"], [type, "A"], [type, "B"]] }, (type) => [[type, "Out"]]])
				graph.registerNodeTemplate("Logic", "greaterThan", ">", "$RETURN = [$A > $B]", [[["number", "A"], ["number", "B"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "lowerThan", "<", "$RETURN = [$A < $B]", [[["number", "A"], ["number", "B"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "greaterThanOrEquals", ">=", "$RETURN = [$A >= $B]", [[["number", "A"], ["number", "B"]], [["bool", "Out"]]])
				graph.registerNodeTemplate("Logic", "lowerThanOrEquals", "<=", "$RETURN = [$A <= $B]", [[["number", "A"], ["number", "B"]], [["bool", "Out"]]])
			},
			trigonometry: (graph) => {
				graph.registerNodeTemplate("Trigonometry", "PI", "π", "$RETURN = [Math.PI]", [[], [["number", "PI"]]])
				graph.registerNodeTemplate("Trigonometry", "timesPI", "* π", "$RETURN = [$A * Math.PI]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "sin", "Sin", "$RETURN = [Math.sin($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "cos", "Cos", "$RETURN = [Math.cos($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "tan", "Tan", "$RETURN = [Math.tan($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "asin", "aSin", "$RETURN = [Math.asin($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "acos", "aCos", "$RETURN = [Math.acos($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "atan", "aTan", "$RETURN = [Math.atan($A)]", [[["number", "Input"]], [["number", "Output"]]])
				graph.registerNodeTemplate("Trigonometry", "atan2", "aTan2", "$RETURN = [Math.atan2($A,$B)]", [[["number", "A"], ["number", "B"]], [["number", "Output"]]])
			},
			string: (graph) => {
				graph.registerType("string", "String", colors.green, "", true, { "number": "parseFloat($INPUT)" }, { "number": "$INPUT.toString()", "bool": "$INPUT.toString()" })
				graph.registerNodeTemplate("String", "concat", "Concat", "$RETURN = [$A + $B]", [[["string", "A"], ["string", "B"]], [["string", "Output"]]])
				graph.registerNodeTemplate("String", "index", "Index", "$RETURN = [$A[$B]]", [[["string", "Input"], ["number", "Position"]], [["string", "Output"]]])

			},
			color: (graph) => {
				graph.registerType("color", "Color", colors.aqua, [0, 0, 0], false, { "number": "$INPUT.size()", "vector": "[$INPUT[0],$INPUT[1]]" }, { "number": "Array.getFilled(3,$INPUT)", "vector": "[$INPUT[0],$INPUT[1],0]" })
				graph.registerType("image", "Image", colors.red, "new ImageData(1,1)", false, {}, {})
				graph.registerNodeTemplate("Color", "imageAspectRatio", "Aspect Ration", "$OUTPUT = [$A.width / $A.height]", [[["image", "Image"]], [["number", "Ratio"]]])
				graph.registerNodeTemplate("Color", "sample", "Sample", "$RETURN = [$A.getPixel($B.scale($A.getSize()).floor()).mul(1 / 255)]", [[["image", "Image"], ["vector", "Position"]], [["color", "Color"]]])
				graph.registerNodeTemplate("Color", "sampleAspected", "Sample Aspected", "$RETURN = [$A.getPixel($B.scale($A.getSize()).scale([1/$A.getAspectRatio(),1]).floor()).mul(1 / 255)]", [[["image", "Image"], ["vector", "Position"]], [["color", "Color"]]])
				graph.registerNodeTemplate("Color", "construct", "Contruct", "$RETURN = [[$A,$B,$C]]", [[["number", "R"], ["number", "G"], ["number", "B"]], [["color", "Color"]]])
				graph.registerNodeTemplate("Color", "split", "Split", "$RETURN = $A", [[["color", "Color"]], [["number", "R"], ["number", "G"], ["number", "B"]]])
				graph.registerNodeTemplate("Color", "greyscale", "Greyscale", "$RETURN = [$A.average()]", [[["color", "Color"]], [["number", "White"]]])
				colors.toArray().forEach(v => {
					if (v.value instanceof Array) {
						graph.registerNodeTemplate("Color Pallete", v.key, v.key.firstUpper(), "$RETURN = [" + JSON.stringify(v.value.mul(1/255)) + "]", [[], [["color", ""]]])
					}
				})

			},
			vector: (graph) => {
				graph.registerType("vector", "Vector", colors.pink, [0, 0], false, { "number": "$INPUT.size()" }, { "number": "Array.getFilled(2,$INPUT)" })
				graph.registerType("vectorlike", "Vector-like", colors.pink.lerp(colors.aqua, 0.5), "[0,0,0]", false, { "color": "$INPUT", "vector": "$INPUT.copy().transform(v => (v.length = 2,v))", "number": "$INPUT.size()" }, { "color": "$INPUT", "vector": "[...$INPUT,0]", "number": "Array.getFilled(3,$INPUT)" })
				var category = "Vector Math"
				var type = "vectorlike"
				graph.registerNodeTemplate("Vectors", "construct", "Contruct", "$RETURN = [[$A,$B]]", [[["number", "X"], ["number", "Y"]], [["vector", "Vector"]]])
				graph.registerNodeTemplate("Vectors", "split", "Split", "$RETURN = $A", [[["vector", "Vector"]], [["number", "X"], ["number", "Y"]]])
				graph.registerNodeTemplate(category, "normalize", "Normalize", "$RETURN = [$A.normalize()]", [[[type, "Input"]], [[type, "Output"]]])
				graph.registerNodeTemplate(category, "scale", "Scale", "$RETURN = [$A.scale($B)]", [[[type, "A"], [type, "B"]], [[type, "Output"]]])
				graph.registerNodeTemplate(category, "add", "Add", "$RETURN = [$A.add($B)]", [[[type, "A"], [type, "B"]], [[type, "Output"]]])
				graph.registerNodeTemplate(category, "substract", "Substract", "$RETURN = [$A.add($B.mul(-1))]", [[[type, "A"], [type, "B"]], [[type, "Output"]]])
				graph.registerNodeTemplate(category, "multiply", "Multiply", "$RETURN = [$A.mul($B)]", [[[type, "A"], ["number", "B"]], [[type, "Output"]]])
				graph.registerNodeTemplate(category, "toAngle", "To Angle", "$RETURN = [$A.toAngle()]", [[[type, "Vector-like"]], [["number", "Angle"]]])
				graph.registerNodeTemplate(category, "size", "Size", "$RETURN = [$A.size()]", [[[type, "Vector-like"]], [["number", "Size"]]])
				graph.registerNodeTemplate(category, "fromAngle", "From Angle", "$RETURN = [vector.fromAngle($A)]", [[["number", "Angle"]], [[type, "Vector-like"]]])
				graph.registerNodeTemplate(category, "lerp", "Lerp", "$RETURN = [$A.lerp($B,$C)]", [[[type, "Start"], [type, "End"], ["number", "Frac"]], [[type, "Output"]]])
			},
			meta: (graph) => {
				var knownTypes = ["number", "string", "color", "vector", "bool"]
				graph.registerType("untyped", "Untyped", colors.brown, "null", false, knownTypes.map(v => { return { key: v, value: "$INPUT" } }).toObject(), knownTypes.map(v => { return { key: v, value: "$INPUT" } }).toObject())
				graph.registerNodeTemplate("Meta", "eval", "Eval", {
					generator: () => "{let arg = $B; $RETURN = [eval($A)]; }",
					supported: knownTypes
				}, [(type) => [["string", "Code"], [type, "arg"]], [["untyped", "Out"]]])
				graph.registerNodeTemplate("Meta", "cast", "Cast", {
					generator: () => "$RETURN = [$A]",
					supported: knownTypes
				}, [[["untyped", "Source"]], (type) => [[type, "Out"]]])
				graph.registerNodeTemplate("Meta", "box", "Box", {
					generator: () => "$RETURN = [$A]",
					supported: knownTypes
				}, [(type) => [[type, "Source"]], [["untyped", "Out"]]])
				graph.registerNodeTemplate("Meta", "convert", "Convert", {
					generator: (type) => {
						if (type == "string") return "$RETURN = [B.toString($A)]"
						else if (type == "number") return "if (typeof $A == 'bool') {$RETURN = [$A == true]} else {$RETURN = [parseFloat($A)]}"
						else if (type == "bool") return "$RETURN = [$A == true]"
					},
					supported: ["number","string","bool"]
				}, [[["untyped","Source"]],(type)=>[[type,"Converted"]]])
			}
		}
	})
	data.NodeGraph.ContextMenu = function ContextMenu(pos, graph = null, { width = 200, buttonHeight = 14, fontSize = 12, font = "Consolas", maxButtons = 100 } = {}) {
		Object.assign(this, {
			pos, width, buttonHeight, fontSize, font, maxButtons,
			buttonCache: graph ? graph.nodeTemplates.toArray().map(v => v.key) : [],
			category: null,
			deleteOffer: null,
			goingToSpawn: null
		})
	}
	Object.assign(data.NodeGraph.ContextMenu.prototype, {
		getSize() {
			return [this.width, this.getButtonAmount() * this.buttonHeight]
		},
		getRect() {
			return shapes.rect(this.pos, this.getSize())
		},
		draw(ctx, graph) {
			var rect = this.getRect()
			ctx.setColor(colors.grey).box(rect.pos.add([-1, -1]), rect.size.add([2, this.getButtonAmount() + 1]))
			for ([i] of FL.repeat(Math.min(this.buttonCache.length, this.maxButtons))) {
				var color = colors.voidGrey
				var name = this.buttonCache[i]
				if (this.goingToSpawn) {
					let type = graph.types[this.goingToSpawn.generatorTypesSupported[i]]
					if (type) {
						color = type.bgColor
						name = type.localizedName
					} else {
						color = colors.red
					}
				} else if (this.category && i != 0) {
					let node = graph.nodeTemplates[this.category].toArray()[i - 1].value
					if (node.generatorTypesSupported) {
						color = colors.green.mul(0.25)
					}
					if (!this.isNodeSupported(node, graph)) {
						color = colors.red.mul(0.25)
					}
				}
				ctx.setColor(color).box([rect.pos[0], rect.pos[1] + i * (this.buttonHeight + 1)], [this.width, this.buttonHeight])
					.setColor(colors.white).text([rect.pos[0], rect.pos[1] + i * (this.buttonHeight + 1)].add([this.width, this.buttonHeight].mul(0.5)), this.fontSize, name, true, this.font)
			}
		},
		getButtonAmount() {
			return this.buttonCache.length.clamp(1, this.maxButtons)
		},
		click(pos, graph) {
			var rect = this.getRect()
			for ([i] of FL.repeat(Math.min(this.buttonCache.length, this.maxButtons))) {
				var lrect = shapes.rect([rect.pos[0], rect.pos[1] + i * (this.buttonHeight + 1)], [this.width, this.buttonHeight])
				if (lrect.testPoint(pos)) {
					if (this.deleteOffer) {
						graph.removeNode(this.deleteOffer)
						graph.contextMenu = null
					} else if (this.goingToSpawn) {
						if (this.buttonCache[i] in graph.types) {
							graph.spawnNode(graph.inverseTranfrom(this.pos), this.goingToSpawn, this.buttonCache[i])
							graph.contextMenu = null
						}

					} else if (this.category == null) {
						this.category = this.buttonCache[i]
						this.buttonCache = ["[..]", ...graph.nodeTemplates[this.category].toArray().map(v => v.value.localizedName)]
					} else {
						if (i == 0) {
							this.category = null
							this.buttonCache = graph.nodeTemplates.toArray().map(v => v.key)
						} else {
							var node = graph.nodeTemplates[this.category].toArray()[i - 1].value
							if (node.generatorTypesSupported) {
								this.goingToSpawn = node
								this.buttonCache = node.generatorTypesSupported
							} else {
								if (this.isNodeSupported(node, graph)) {
									graph.spawnNode(graph.inverseTranfrom(this.pos), node)
									graph.contextMenu = null
								}
							}
						}
					}
				}
			}
		}
	})
	data.NodeGraph.ContextMenu.prototype.isNodeSupported = function (node, graph) {
		if (node.generatorTypesSupported) {
			return true
		} else {
			var inputTypes = (typeof node.inputs == "function" ? node.inputs(null) : node.inputs)
			var outputTypes = (typeof node.outputs == "function" ? node.outputs(null) : node.outputs)
			var allSupported = true
			for ([v] of FL.forEach([...inputTypes, ...outputTypes])) {
				if (!(v[0] in graph.types)) {
					allSupported = false
					break
				}
			}
			return allSupported
		}
	}
	data.NodeGraph.ContextMenu.makeDeleteOffer = function (pos, targetNode, settings = {}) {
		var ret = new data.NodeGraph.ContextMenu(pos, null, settings)
		Object.assign(ret, {
			pos,
			buttonCache: ["< Delete >"],
			category: "",
			deleteOffer: targetNode
		})
		return ret
	}
	return data
})