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
		this.offset = [0,0]
		this.selected = {
			node: null,
			portNum: 0,
			type: "",
		}
		
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
				
				v.type.inputPorts.gui = gui
				v.type.outputPorts.gui = gui
				v.type.inputPorts.forEach((w,i,a)=>{
					if (this.selected.node == v && this.selected.portNum == i) {
						a.gui.iui.ctx.setColor(colors.darkYellow.mul(Math.abs(Math.sin(Date.now() / 1000 * Math.PI)))).box(getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true).add([-2,-2]),portSize.add([4,4]))
						
					}
					var event = a.gui.button({color:types[w],size:portSize,pos:getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true)})
					if (event.test.lClick) {
						if (this.selected.node == v && this.selected.portNum == i) {
							this.selected.node = null
						} else {
							this.selected.node = v
							this.selected.portNum = i
							this.selected.type = w
							v.inputConn[i].node = null
						}
						
					}
					
					if (v.inputConn[i].node && v.inputConn[i].node.type) {
						a.gui.iui.ctx.setColor(types[w]).zigzagLine(
							getPortPos(i,a.length,v.pos.add(nodeSize.mul(-0.5)).add(this.offset),true).add(portSize.mul(0.5)),
							getPortPos(v.inputConn[i].portNum,v.inputConn[i].node.type.outputPorts.length,v.inputConn[i].node.pos.add(nodeSize.mul(-0.5)).add(this.offset),false).add(portSize.mul(0.5)),
							3
						)
						
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
		})
		
		iui.layers.context.push((gui)=>{
			if (gui.testRect({pos:[0,0],size:[500,500]}).test.rClick) {
				this.contextOpen = !this.contextOpen
				this.contextPos = gui.iui.mouseData.pos.clone()
			}
			if (this.contextOpen) {
				var menu = gui.rect({pos:this.contextPos,size:[0,0]})
				var spawned = false
				module.allNodes.forEach((v,i)=>{
					if (menu.button({pos:[100 * Math.floor(i / contextLimit),15 * (i % contextLimit)],size:[100,15],txt:v.name.replace(/\n/g," "),textHeight:10}).test.lClick && !spawned) {
						this.addNode(v,this.contextPos.add(this.offset.mul(-1)))
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
				func: "func = " + (new Function ("inp","global","global.finalVal = ["+ Array.getFilled(outputFields.length,"inp").map((v,i)=>{
					return v + "[" + i + "] || " + 0
				}).join(",") +"]")).toString(),
				indestructable:  true
			},ouputPos)
		}
		
		this.compile = ()=> {
			var editor = this
			if (outputFields.length <= 0) {
				throw new Error("A node chain can not be compiled without the destination Out node.")
			}
			var connMap = {node:this.nodes[0],inputs:[],outNum:0,id:0}
			var recursiveChain = function (connMap) {
				connMap.node.inputConn.forEach((v,i)=>{
					if (!v.node) {return}
					var newConnMap = {node:v.node,inputs:[],outNum:v.portNum,id:editor.nodes.indexOf(v.node)}
					connMap.inputs[i] = newConnMap
					recursiveChain(newConnMap)
				})
			}
			recursiveChain(connMap)
			
			var functionMap = {func: this.nodes[0].type.func.toString(),inputs:[],outNum:0,id:0}
			var recursiveFunc = function (funcMap,connMap) {
				connMap.inputs.forEach((v,i)=>{
					if (!v) {return}
					funcMap.inputs[i] = {func: v.node.type.func.toString(),inputs:[],outNum:v.outNum,id:v.id}
					recursiveFunc(funcMap.inputs[i],v)
				})
			}
			recursiveFunc(functionMap,connMap)
			return functionMap		}
		
		this.execCompiled = function (funcMap,global = {}) {
			var cache = []
			var walker = function (func) {
				if (cache[func.id]) {
					var retA = cache[func.id]
				} else {
					var inp = []
					inp = func.inputs.map((v,i)=>{return walker(v)})
					if (typeof func.func != "function") {
						var fun = eval(func.func)
					} else {
							var fun = func.func
					}
					var retA = fun(inp,global) || []
					cache[func.id] = retA
				}
				
				var ret = retA[func.outNum]
				return ret
			}
			walker(funcMap)
			return global.finalVal
		}
		
		this.execDirect = function (global = {}) {
			return this.execCompiled(this.compile(),global)
		}
		
		this.prebakeCompiled = (compiled)=>{
			var walker = function (...args) {
				args[0].func = eval(args[0].func)
				args[0].inputs.forEach((v)=>{
					walker(v)
				})
			}
			walker(compiled)
			return compiled
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
	module.EditorNode = function EditorNode(name,func = ()=>{},inputPorts = [],outputPorts = []) {
		this.name = name
		this.func = func
		this.inputPorts = inputPorts
		this.outputPorts = outputPorts
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
			module.allNodes.push(new module.EditorNode("Add +",([a = 0,b = 0]) => {
				return [a + b]
			},["number","number"],["number"]))
			module.allNodes.push(new module.EditorNode("Buffer",([a = 0]) => {
				return [a]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("One Minus",([a = 0]) => {
				return [1 - a]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("Substract -",([a = 0,b = 0]) => {
				return [a - b]
			},["number","number"],["number"]))
			module.allNodes.push(new module.EditorNode("Divide /",([a = 0,b = 0]) => {
				return [a / b]
			},["number","number"],["number"]))
			module.allNodes.push(new module.EditorNode("Multiply *",([a = 0,b = 0]) => {
				return [a * b]
			},["number","number"],["number"]))
			module.allNodes.push(new module.EditorNode("Modulo %",([a = 0,b = 0]) => {
				return [a % b]
			},["number","number"],["number"]))
			module.allNodes.push(new module.EditorNode("Power **",([a = 0,b = 0]) => {
				return [a ** b]
			},["number","number"],["number"]))
			module.allNodes.push(new module.EditorNode("0.1",(inp) => {
				return [0.1]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("0.5",(inp) => {
				return [0.5]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("01",(inp) => {
				return [1]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("02",(inp) => {
				return [2]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("05",(inp) => {
				return [5]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("10",(inp) => {
				return [10]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("255",(inp) => {
				return [255]
			},[],["number"]))
			module.allNodes.push(new module.EditorNode("Random",([inp = 1]) => {
				return [Math.random(inp)]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("Floor",([inp = 100]) => {
				return [Math.floor(inp)]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("Abs",([inp = 100]) => {
				return [Math.abs(inp)]
			},["number"],["number"]))
		},
		logic: ()=>{
			module.allNodes.push(new module.EditorNode("True",(inp)=> {
				return [true]
			},[],["truth"]))
			module.allNodes.push(new module.EditorNode("False",(inp)=> {
				return [false]
			},[],["truth"]))
			module.allNodes.push(new module.EditorNode("And",([a = false,b = false])=> {
				return [a && b]
			},["truth","truth"],["truth"]))
			module.allNodes.push(new module.EditorNode("Or",([a = false,b = false])=> {
				return [a || b]
			},["truth","truth"],["truth"]))
			module.allNodes.push(new module.EditorNode("Xor",([a = false,b = false])=> {
				return [a != b]
			},["truth","truth"],["truth"]))
			module.allNodes.push(new module.EditorNode("Equals",([a = false,b = false])=> {
				return [a == b]
			},["number","number"],["truth"]))
			module.allNodes.push(new module.EditorNode("Greater Than",([a = false,b = false])=> {
				return [a > b]
			},["number","number"],["truth"]))
			module.allNodes.push(new module.EditorNode("Lower Than",([a = false,b = false])=> {
				return [a < b]
			},["number","number"],["truth"]))
			module.allNodes.push(new module.EditorNode("Not",([a = false])=> {
				return [!a]
			},["truth"],["truth"]))
			module.allNodes.push(new module.EditorNode("Truth To\nNumber",([a = false])=> {
				return [(a) ? 1 : 0]
			},["truth"],["number"]))
			module.allNodes.push(new module.EditorNode("Number\nTo Truth",([a = 0])=> {
				return [(a) ? true : false]
			},["number"],["truth"]))
			
		},
		trig: ()=>{
			module.allNodes.push(new module.EditorNode("Sin",([inp = 0])=>{
				return [Math.sin(inp)]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("Cos",([inp = 0])=>{
				return [Math.cos(inp)]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("Tan",([inp = 0])=>{
				return [Math.tan(inp)]
			},["number"],["number"]))
			module.allNodes.push(new module.EditorNode("PI",([inp = 1])=>{
				return [Math.PI * inp]
			},["number"],["number"]))
		}
	}
	return module
})