require("iui.js")
B.module.init("editor.js",0.1,[["iui",1]],()=>{
	const sizeMul = 0.75
	const nodeSize = [100,75].mul(sizeMul)
	const portSize = [10,10].mul(sizeMul)
	const contextLimit = 15
	var getPortPos = function (number,total,nodePos,begin = true) {
		return nodePos.add([((begin) ? -portSize[0] : nodeSize[0]),(nodeSize[1]).segment(total + 1)[number] - portSize[1] / 2])
	}
	
	const types = {
		number: colors.white,
		vector2: colors.aqua,
		color: colors.green,
		string: colors.red,
		truth: colors.orange
	}
	var module = {}
	var docs = B.docs.create("Editor.js","A module for rendering a basic node editor to canvases")
	docs.bindModule(B.module.list["editor.js"])
	docs.construct("Editor","iui : ImmediateUI",
	`Creates an instance of the --Editor-- class. It will automaticaly register itself to the
--ImmediateUI-- instance. There is no automatic way to remove it, but you can remove it
manualy.
**iui.layers.ground.--splice--(idOfTheEditor,--1--)  --//You'll need to find the id yourself**
The drawing of the --Editor-- will be executed together with the --ImmediateUI--. It will draw
all nodes every update with dimensions of --100--px width and --50--px height. New nodes can
be created by rightclicking the canvas, which will open a contextmenu of all detected nodes.
There are no predefined nodes, more on that later. If there is atleast one value in the
outputFields --Array-- the canvas will start with an output node which will pipe all
its inputs to the --return-- --Array-- of the compiled function.`)
	
	module.Editor = function Editor(iui,ouputPos = [0,0],outputFields = []) {
		var theThis = this
		this.iui = iui
		this.nodes = []
		
		this.contextOpen = false
		this.contextPos = [0,0]
		this.scrollOffset = 0;
		this.offset = [0,0]
		this.selected = {
			node: null,
			portNum: 0,
			type: "",
		}
		
		iui.ctx.canvas.canvas.addEventListener("wheel",event=>{
			if (event.deltaY < 0 && this.scrollOffset > 0) {
				this.scrollOffset--
			} else if (event.deltaY < 0 && this.scrollOffset <= 0) {
				this.scrollOffset = module.allNodes.length - 1
			} else {
				this.scrollOffset++
			}
			event.preventDefault()
		})
		
		iui.layers.ground.push((gui)=>{
			if (gui.iui.keyBuffer.indexOf("r") != -1) {
				this.offset = this.nodes[0].pos.mul(-1).add([250,250])
			}
			this.nodes.forEach((v,mi)=>{
				var node = gui.testRect({pos:v.pos.add(nodeSize.mul(-0.5)).add(this.offset),size:nodeSize})
				if (node.test.down) {
					v.pos = v.pos.add(node.test.drag)
				}
				if (node.test.over && gui.iui.keyBuffer.indexOf("Delete") != -1 && !v.type.indestructable) {
					this.nodes.forEach((w)=>{
						w.inputConn.forEach((w)=>{
							if (w.node == v) {
								w.node = null
							}
						})
					})
					this.nodes.splice(mi,1)
				}
			})
			var unselect = false
			if (gui.testRect({pos:[0,0],size:[500,500]}).test.lClick && this.selected.node) {
				unselect = true
			}
			this.nodes.forEach((v,mi)=>{
				v.type.inputPorts.gui = gui
				v.type.outputPorts.gui = gui
				v.type.inputPorts.forEach((w,i,a)=>{
					if (v.inputConn[i].node && v.inputConn[i].node.type) {
						/*a.gui.iui.ctx.setColor(types[w]).zigzagLine(
							getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true).add(portSize.mul(0.5)),
							getPortPos(v.inputConn[i].portNum,v.inputConn[i].node.type.outputPorts.length,v.inputConn[i].node.pos.add(nodeSize.mul(-0.5)).add(this.offset),false).add(portSize.mul(0.5)),
							3
						)*/
						let myPos = getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true).add(portSize.mul(0.5))
						let theirPos = getPortPos(v.inputConn[i].portNum,v.inputConn[i].node.type.outputPorts.length,v.inputConn[i].node.pos.add(nodeSize.mul(-0.5)).add(this.offset),false).add(portSize.mul(0.5))
						a.gui.iui.ctx.setColor(types[w]).shape([
							myPos,
							[myPos[0] - Math.clamp(20,0,(myPos[0] - theirPos[0]) / 2),myPos[1]],
							[theirPos[0] + Math.clamp(20,0,(myPos[0] - theirPos[0]) / 2),theirPos[1]],
							theirPos
						],false,3)
					}
				})
			})
			this.nodes.forEach((v,mi)=>{
				
				v.type.inputPorts.gui = gui
				v.type.outputPorts.gui = gui
				v.type.inputPorts.forEach((w,i,a)=>{
					if (this.selected.node == v && this.selected.portNum == i) {
						let myPos = getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true).add(portSize.mul(0.5))
						let theirPos = a.gui.iui.mouseData.pos
						a.gui.iui.ctx.setColor(types[w]).box(theirPos.add(portSize.mul(-0.5)),portSize)
						a.gui.iui.ctx.setColor(types[w]).shape([
							myPos,
							[myPos[0] - Math.clamp(20,0,(myPos[0] - theirPos[0]) / 2),myPos[1]],
							[theirPos[0] + Math.clamp(20,0,(myPos[0] - theirPos[0]) / 2),theirPos[1]],
							theirPos
						],false,3)
						
					}
					var event = a.gui.button({color:types[w],size:portSize,pos:getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true)})
					if (event.test.lClick) {
						if (this.selected.node == v && this.selected.portNum == i) {
							this.selected.node = null
						} else {
							this.selected.node = v
							this.selected.portNum = i
							this.selected.type = w
							unselect = false
							v.inputConn[i].node = null
						}
					}
				})
				v.type.outputPorts.forEach((w,i,a)=>{
					var event = a.gui.button({color:types[w],size:portSize,pos:getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),false)})
					if (event.test.lClick && this.selected.node && this.selected.node != v && this.selected.type == w) {
						this.selected.node.inputConn[this.selected.portNum].node = v
						this.selected.node.inputConn[this.selected.portNum].portNum = i
						this.selected.node = null
					}
				})
				gui.label({center:true,pos:v.pos.add(nodeSize.mul(-0.5)).add(this.offset),size:nodeSize,txt:v.type.name,color:colors.gray,textColor:colors.white,textHeight:nodeSize[1] / 4})
			})
			if (gui.testRect({pos:[0,0],size:[500,500]}).test.mDown) {
				this.offset = this.offset.add(gui.testRect({pos:[0,0],size:[500,500]}).test.drag)
			}
			if (unselect) {
				this.selected.node = null
			}
		})
		
		iui.layers.context.push((gui)=>{
			if (gui.testRect({pos:[0,0],size:[500,500]}).test.rClick) {
				this.contextOpen = !this.contextOpen
				this.contextPos = gui.iui.mouseData.pos.clone()
			}
			if (this.contextOpen) {
				var menu = gui.rect({pos:this.contextPos,size:[0,0]})
				var spawned = false
				repeat(contextLimit,(i)=>{
					var curr = module.allNodes[(i + this.scrollOffset) % module.allNodes.length]
					if (menu.button({color:curr.color,pos:[100 * Math.floor(i / contextLimit),15 * (i % contextLimit)],size:[100,15],txt:curr.name.replace(/\n/g," "),textHeight:10}).test.lClick && !spawned) {
						this.addNode(curr,this.contextPos.add(this.offset.mul(-1)))
						spawned = true
					}
				})
			}
			if (gui.testRect({pos:[0,0],size:[500,500]}).test.lClick) {
				this.contextOpen = false
			}
		})
		
		this.addNode = function(node,pos) {
			return this.nodes[this.nodes.push({
				type: node,
				pos,
				inputConn: Array.getFilled(node.inputPorts.length,()=>{
					return Object.assign(new Object(),{
						node: null,
						portNum: 0
					})
				}),
			})]
		}
		
		if (outputFields.length > 0) {
			this.addNode({
				name: "Out",
				inputPorts: outputFields,
				outputPorts:[],
				func: "#GLOBAL.FINAL_VAR = #INPUTS",
				indestructable:  true
			},ouputPos)
		}
		
		this.compile = (nodeID = 0)=>{
			var editor = this;
			var code = ["// Automaticaly generated code from editor.js","// By bt7s7k7","var VALUES = []",""];
			var parsedList = []
			var all = []
			var parsingID = -1;
			
			var parser = function (toMap,outputNum) {
				parsingID++;
				var curr = {node: toMap,id: parsingID,inputs: [],outputNum,type: toMap.type,globalID:editor.nodes.indexOf(toMap)}
				all[curr.globalID] = {node:curr.node,wasWrittiten:false,globalID:curr.globalID}
				if (parsingID == 0) {
					origin = curr
				}
				toMap.inputConn.forEach((v,i)=>{
					if (v.node) {
						curr.inputs[i] = parser(v.node,v.portNum)
					} else {
						curr.inputs[i] = null;
					}
					
				})
				return curr;
			}
			var writer = function(toWrite) {
				var curr = all[toWrite.globalID]
				if (curr.wasWrittiten) return;
				var ids = []
				toWrite.inputs.forEach((v,i)=> {
					if (v) {
						writer(v)
						ids[i] = "VALUES["+ v.globalID +"][" + v.outputNum + "]"
					} else {
						ids[i] = "0"
					}
				})
				code.push("// " + toWrite.type.name + " #" + toWrite.globalID)
				code.push("VALUES[" + toWrite.globalID + "] = []")
				var funcCode = toWrite.type.func.toString()
				funcCode = funcCode.replace(/#RETURN/g,"VALUES[" + toWrite.globalID + "]")
				                   .replace(/#INPUTS/g,"["+ ids.join(",") +"]")
								   .replace(/#GLOBAL/g,"global")
				ids.forEach((v,i)=> {
					funcCode = funcCode.replace(new RegExp("#"+ (("ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i])||"A"),"g"),v)
				})
				code.push(funcCode)
				code.push("")
				curr.wasWrittiten = true
				
			}
			
			var origin = parser(editor.nodes[nodeID],false)
			writer(origin)
			code.push("")
			code.push("return global.FINAL_VAR || []")
			var ret = code.join("\n")
			return eval("(global = {})=>{\n"+ ret +"\n}")
		}
	}
	docs.endObject()
	
	docs.construct("EditorNode","name : String,func : function = ()=>{},inputPorts : Array = [],outputCount : Array = []",
`Creates a new type of node. Input and ouput ports --Array-- specifies the names and types, their
--length-- specifies the number of ports. The --function-- will be executed every tick with an --Array--
of all inputs and global data --Object--. The --function-- is expected to return an --Array-- of outputs. For example:
**["heigth","number"] --//'height' is the name, 'number' is the type--**
For every type there is a specified color. Here is a list of all valid types:
**number --//white--
vector2 --//light blue--
color --//green--
string --//reg--**
Only ports with the same type will connect. If the function throws an error it will be reported by the --Editor--.
Here is an example of an addition --EditorNode--.
**allNodes.--push--(--new-- --EditorNode--("Add",--function-- (inp) {
	--return-- inp[--0--] + inp[--1--]
}),["number","number"],["number"])**`
)
	module.editorNode = function editorNode(name,func = "",inputPorts = [],outputPorts = [],color = colors.voidGrey) {
		return {
			name,
			func,
			inputPorts,
			outputPorts,
			color
		}
	}
	docs.endObject()
	module.allNodes = []
	
	docs.prop("nodeLibaries","Object",
`In this --Object-- there are premade libaries of nodes. It's just a bunch of --functions--. When they are executed they
will register all of their nodes. This can not be undone. Here is a list of all the libaries:
**math
colorMath
**`
	)
	module.nodeLibaries = {
		math: ()=>{
			var color = colors.red.mul(0.5)
			module.allNodes.push(module.editorNode("+","#RETURN = [(#A || 0) + (#B || 0)]",["number","number"],["number"],color))
			module.allNodes.push(module.editorNode("-","#RETURN = [(#A || 0) - (#B || 0)]",["number","number"],["number"],color))
			module.allNodes.push(module.editorNode("*","#RETURN = [(#A || 0) * (#B || 0)]",["number","number"],["number"],color))
			module.allNodes.push(module.editorNode("/","#RETURN = [(#A || 0) / (#B || 0)]",["number","number"],["number"],color))
			module.allNodes.push(module.editorNode("%","#RETURN = [(#A || 0) % (#B || 0)]",["number","number"],["number"],color))
			module.allNodes.push(module.editorNode("**","#RETURN = [(#A || 0) ** (#B || 0)]",["number","number"],["number"],color))
			module.allNodes.push(module.editorNode("Sqrt","#RETURN = [Math.sqrt(#A || 0)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Buffer","#RETURN = [(#A || 0)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("One Minus","#RETURN = [1-(#A || 0)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Random","#RETURN = [Math.random(#A || 1)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Abs","#RETURN = [Math.abs(#A)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Floor","#RETURN = [Math.floor(#A)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("0","#RETURN = [0]",[],["number"],color))
			module.allNodes.push(module.editorNode("0.1","#RETURN = [0.1]",[],["number"],color))
			module.allNodes.push(module.editorNode("0.5","#RETURN = [0.5]",[],["number"],color))
			module.allNodes.push(module.editorNode("1","#RETURN = [1]",[],["number"],color))
			module.allNodes.push(module.editorNode("2","#RETURN = [2]",[],["number"],color))
			module.allNodes.push(module.editorNode("5","#RETURN = [5]",[],["number"],color))
			module.allNodes.push(module.editorNode("10","#RETURN = [10]",[],["number"],color))
			module.allNodes.push(module.editorNode("100","#RETURN = [100]",[],["number"],color))
			module.allNodes.push(module.editorNode("255","#RETURN = [255]",[],["number"],color))
		},
		trig: ()=>{
			var color = colors.green.mul(0.5)
			module.allNodes.push(module.editorNode("PI","#RETURN = [Math.PI * (#A || 0)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Sin","#RETURN = [Math.sin(#A || 0)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Cos","#RETURN = [Math.cos(#A || 0)]",["number"],["number"],color))
			module.allNodes.push(module.editorNode("Atan2","#RETURN = [Math.atan2((#A || 0),(#B || 0))]",["number","number"],["number"],color))
		},
		logic: ()=>{
			var color = colors.orange.mul(0.5)
			module.allNodes.push(module.editorNode("True","#RETURN = [true]",[],["truth"],color))
			module.allNodes.push(module.editorNode("False","#RETURN = [false]",[],["truth"],color))
			module.allNodes.push(module.editorNode("Is Zero","#RETURN = [#A == 0]",["number"],["truth"],color))
			module.allNodes.push(module.editorNode("Is Positive","#RETURN = [#A > 0]",["number"],["truth"],color))
			module.allNodes.push(module.editorNode("Is Negative","#RETURN = [#A < 0]",["number"],["truth"],color))
			module.allNodes.push(module.editorNode("Is In Range","#RETURN = [Math.abs((#A || 0) - (#B || 0)) <= (#C || 0)]",["number","number","number"],["truth"],color))
			module.allNodes.push(module.editorNode("Not","#RETURN = [!#A]",["truth"],["truth"],color))
			module.allNodes.push(module.editorNode("And","#RETURN = [#A && #B]",["truth","truth"],["truth"],color))
			module.allNodes.push(module.editorNode("Or","#RETURN = [#A || #B]",["truth","truth"],["truth"],color))
			module.allNodes.push(module.editorNode("Xor","#RETURN = [#A != #B]",["truth","truth"],["truth"],color))
			module.allNodes.push(module.editorNode("Ternary","#RETURN = [(#A) ? (#B || 0) : (#C || 0)]",["truth","number","number"],["number"],color))
		}
	}
	return module
})