/*
	DEPENDENCES
	
	- canvas.js
	- prototypes.js
*/
B.module.require("canvas","stuff/canvas.js")
B.module.init("iui",1,[["canvas",1.002],["prototypes",1.003]],()=>{
	var window = {}
	const layerNames = ["ground","window","alert","context"]
	var docs = B.docs.create("ImmediateUI","!! This module is deprecated !!\nAllows for creation of immediate UIs on canvases for applicational uses.")
	docs.construct("ImmediateUI","ctx : CanvasUtil,slave : boolean = false","Creates ImmediateUI instance.")
	docs.prop(".bgColor","Number[3]","Backround color to fill the canvas before drawing.")
	docs.func(".update","","undefined","Triggers a redraw.")
	docs.func(".layers.{ground,window,alert,context}.push","callback : function","id (Number)",
		"Registers a function into the calling stack for the specified layer.\n\n" + 
		"The function gets called with a IUIObject as first argument.\n" + 
		"It can be used to draw on the canvas. More on that later."
	)
	docs.func(".createSlave","","slave (ImmediateUI)","Adds a slave IUI to be updated after stack.")
	docs.endObject()
	docs.bindModule("iui")
	window.ImmediateUI = function ImmediateUI(ctx, slave = false) {
		{ //Properities
			this.ctx = ctx
			this.canvas = ctx.canvas
			this.element = ctx.canvas.canvas
			
			this.bgColor = [0,0,0];
			this.isSlave = slave;
			this.slaves = []
			this.enabled = true
			
			this.layers = [[], [], [], []]
			this.layers.forEach((v,i)=>{
				v.register = function(func) {
					v.push(func)
				}
				this.layers[layerNames[i]] = v
			})
		}
		
		{ //Objects
			this.options = {
				clear: !slave,
				useGlobalOffset: true
			}
			this.mouseData = {
				down:[false,false,false],
				wasDown:[false,false,false],
				pos: [-1, -1],
				wasPos: [-1,-1],
				delta:[0,0]
			}
			this.keyBuffer = []
			this.keyBuffer.flush = function () {
				this.length = 0
			}
		}
		
		{ //Input listener
			/*
				down >> wasDown
				temp << [0,0,0]
				temp[button] << true
				temp >> down
			
			*/
			let md = this.mouseData
			this.element.addEventListener("mousedown",(event)=>{

				var temp = [false,false,false]
				temp[event.button] = true
				temp.copyTo(md.down)
				event.preventDefault()
			})
			this.element.addEventListener("mouseup",(event)=>{
				event.preventDefault()
				md.down[event.button] = false
			})
			this.element.addEventListener("mouseleave",(event)=>{
				event.preventDefault()
				var temp = [false,false,false]
				temp.copyTo(md.down)
			})
			this.element.addEventListener("mousemove",(event)=>{
				vector.fromObject(event,"offset").copyTo(md.pos)
				event.preventDefault()
			})
			addEventListener("keydown",(event)=>{
				this.keyBuffer.push(event.key)
			})
			this.element.addEventListener("contextmenu",(event)=>{
				event.preventDefault()
			})
			
		}

		{ //Methods
			this.update = function () {
				this.mouseData.pos.add(this.mouseData.wasPos.mul(-1)).copyTo(this.mouseData.delta)
				
				if (this.enabled) {
					if (this.options.clear) {
						ctx.setColor(this.bgColor).fill()
					}
					this.layers.forEach((v)=>{v.forEach((c)=>{c(new IUIObject(this,[0,0],this.ctx.getSize()))})})
					this.slaves.forEach((v)=>{v.update()})
					
				}
				this.keyBuffer.flush()
				
				this.mouseData.pos.copyTo(this.mouseData.wasPos)
				this.mouseData.down.copyTo(this.mouseData.wasDown)
			}
			
			this.createSlave = function() {
				var slave = new ImmediateUI(this.ctx,true)
				this.slaves.push(slave)
				return slave
			}
		}
	}
	
	docs.construct("IUIObject","iui : ImmediateUI, pos : Number[2][, size : Number[2]]",
		"Hierarchical system for using IUI. Every function in the callstack will be called\n" +
		"with this as its first argument. Its methods correspond with all alvalible --IUIObject-- instances.\n" + 
		"It's mostly created automaticaly, you won't ever need to reate it."
	)
	docs.func(".rect","options : Object","rect (IUIObject)",
		"Will draw a rectangle on the canvas.\n\n" + 
		"Options:" + 
		"\n**color : --Number--[--3--] = colors.--voidGrey--" +
		"\npos : --Number--[--2--]" +
		"\nsize : --Number--[--2--]"
	)
	docs.func(".text","options : Object","text width (Number)",
		"Will draw text on the canvas.\n\n" + 
		"Options:\n**center : --Boolean-- = --false--  --//Text wrapping by CanvasUtil rules.--\n" + 
		"textColor : --Number--[--3--] = colors.--white--\nfont : --String-- = 'Arial' --//A CSS font--\n" +
		"textHeight : --Number-- = --20--\ntxt : --String-- = ' '\npos : --Number--[--3--]"
	)
	docs.func(".label","options : Object","text width (Number)",
		"Will draw al label, which is a rect with text in the middle. Has none own\n" + 
		"option but inherits all from --.text-- and --.rect--"
	)
	docs.func(".button","options : Object","event (IUIMouseEvent)",
		"Draws a interactable button on the canvas. Will return the\n" + 
		"--IUIMouseEvent-- which contains mouse data.\n\n" + 
		"Options:\n**" +
		"feedback : --Boolean-- = --true--**\n" +
		"Also inherits all --.label-- options."
	)
	docs.func(".testRect","options : Object","event (IUIMouseEvent)",
		"Will return mouse event in the rectangle specified.\n\nOptions:\n**" + 
		"pos : --Number--[--2--]\nsize : --Number--[--2--]"
	)
	docs.func(".window","options : Object","window (IUIObject)",
		"Will draw a optionaly draggable window on the canvas.\n" +
		"The window will have a name bar, minimize and close buttons\n" + 
		"on the top and a border around. The required --IUIPersist--\n" + 
		"in options is used to store persitent data and should be kept\n" + 
		"for future callings. The window doesn't block mouse events.\n\n" + 
		"Options:\n**" + 
		"closable : --Boolean-- = --true--\ndragable: --Boolean-- = --true--\n" +
		"bgColor : --Number--[--3--] = colors.--voidGrey--\n" +
		"labelColor :  --Number--[--3--] = colors.--grey--\n" + 
		"labelTextColor : --Number--[--3--] = colors.--white--\n" + 
		"barHeight : --Number-- = --20--\n" + 
		"size : --Number--[--2--]\nlabel : --String--\n" + 
		"persist : --IUIPersist--**\n" + 
		"The --IUIPersist-- must contain the pos : --Number--[--2--] field\n" + 
		"and can contain the closed and terminated --Boolean---s"
	)
	docs.text("Adding new IUI elements",
		"--IUIObject-- is designed to be easily expanded.\n" + 
		"It's just needed to add a funtion to --IUIObject--'s\n" + 
		"--prototype--\n\nExample:\n**" + 
		"--IUIObject--.--prototype--.myNewElement = --function-- () {\n\n}**\n" +
		"Standard is to use options --Object-- as the first argument and then\n" +
		"use B.--parseOptions--() to verify requirements, then return the new\n" +
		"--IUIObject-- to draw further into.\n\nExample:\n**" +
		"--IUIObject--.--prototype--.myNewElement = --function-- (opt) {\n" + 
		"	--var-- opt = B.--parseOptions--(opt,{},['pos'])\n" + 
		"	--return-- --new-- --IUIObject--(--this.iui--,--this--.--pos--)\n}"
	)
	docs.endObject()
	
	window.IUIObject = function IUIObject(iui,pos,size = [0,0]) {
		this.pos = pos
		this.size = size
		this.iui = iui
		
		this.rect = function (opt) {
			var opt = B.parseOptions(opt,{color:colors.voidGrey},["pos","size"])
			this.iui.ctx.setColor(opt.color).box(this.pos.add(opt.pos),opt.size)
			return new IUIObject(this.iui,this.pos.add(opt.pos),opt.size)
		}
		this.text = function (opt) {
			var opt = B.parseOptions(opt,{center:false,textColor:colors.white,font:"Arial",textHeight:20,txt:""},["pos"])
			var ctx = this.iui.ctx
			var ret = {}
			ctx.setColor(opt.textColor).text(this.pos.add(opt.pos),opt.textHeight,opt.txt,opt.center,opt.font,ret)
			return ret.width
		}
		this.label = function (opt) {
			var rect = this.rect(opt)
			var tOpt = Object.assign({},opt)
			if (opt.center) {
				tOpt.pos = opt.size.mul(0.5)
			} else {
				tOpt.pos = [0,opt.size[1] / 1.5]
			}
			return rect.text(tOpt)
		}
		this.button = function (opt) {
			var opt = B.parseOptions(opt,{center:true,feedback:true,textHeight:10,txt:"",textColor:colors.white,center:true,color:colors.darkGrey},["pos","size"])
			var md = new IUIMouseEvent(this.iui.mouseData,shapes.rect(opt.pos.add(this.pos),opt.size))
			if (opt.feedback) {
				if (md.test.down) {
					opt.color = opt.color.add([-50,-50,-50])
				} else if (md.test.over) {
					opt.color = opt.color.add([50,50,50])
				}
			}
			this.label(opt)
			return md
		}
		this.testRect = function (opt) {
			var opt = B.parseOptions(opt,{},["pos","size"])
			return new IUIMouseEvent(this.iui.mouseData,shapes.rect(opt.pos.add(this.pos),opt.size))
		}
		this.window = function (opt) {
			var opt = B.parseOptions(
				opt,
				{closable:false,dragable:true,bgColor:colors.voidGrey,labelColor:colors.grey,labelTextColor:colors.white,barHeight:20},
				["size","persist","label"]
			)
			if (opt.persist.get("open",true)) {
				if (opt.dragable) {
					opt.persist.set("pos",opt.persist.get("pos",[0,0]).add(
						this.testRect({pos:opt.persist.get("pos",[0,0]),size:[opt.size[0] - opt.barHeight * 2,opt.barHeight]}).test.drag
					))
				}
				var win = this.rect({pos:opt.persist.get("pos",[0,0]),size:opt.size,color:opt.bgColor})
				
				win.button({pos:[0,0],size:[opt.size[0] - opt.barHeight * 2,opt.barHeight],color:opt.labelColor,txt:opt.label,textHeight:opt.textHeight,feedback:opt.dragable}).test.drag
				
				
				if (win.button({
					pos:[opt.size[0] - opt.barHeight,0],size:[1,1].mul(opt.barHeight),color:colors.red,txt:"X",textColor:colors.white,textHeight:opt.textHeight
					}).test.lClick) {
					opt.persist.set("terminated",true)
					opt.persist.set("open",false)
				}
				if (win.button({
					pos:[opt.size[0] - opt.barHeight * 2,0],size:[1,1].mul(opt.barHeight),color:colors.blue,txt:"_",textColor:colors.white,textHeight:opt.textHeight
					}).test.lClick) {
					opt.persist.set("open",false)
				}
				this.iui.ctx.setColor(opt.labelColor).rect(this.pos.add(opt.persist.get("pos",[0,0])),opt.size)
			}
		}
	}
	
	docs.construct("IUIMouseEvent","mouseData : Object, rect : Object",
		"It's used for reading mouse data of a --IUIObject--.--button-- or --testRect--.\n"+
		"Contains all raw data and pre-compiled tests in the test --Object--. Raw data\n" + 
		"is not important. All tests are of type --Boolean--. They can be accessed like so:\n**" + 
		"--IUIMouseEvent--.test.lClick \n" +
		"--IUIMouseEvent--.test.mClick \n" +
		"--IUIMouseEvent--.test.rClick \n" +
		"--IUIMouseEvent--.test.lDown \n" +
		"--IUIMouseEvent--.test.mDown \n" +
		"--IUIMouseEvent--.test.rDown \n" +
		"--IUIMouseEvent--.test.click \n" +
		"--IUIMouseEvent--.test.down \n" +
		"--IUIMouseEvent--.test.over \n" +
		"--IUIMouseEvent--.test.drag --//An exeption. This is an Number[2]--\n"
	)

	window.IUIMouseEvent = function IUIMouseEvent(mouseData,rect) {
		this.length = 3
		mouseData.down.copyTo(this)
		this.buttons = mouseData.down.clone()
		this.clicked = mouseData.down.testForEach(mouseData.wasDown,(a,b)=>{return a && !b})
		this.pos = mouseData.pos.clone()
		this.delta = mouseData.delta.clone()
		this.mouseOver = rect.testPoint(this.pos)
		
		this.test = {
			lClick: this.mouseOver && this.clicked[0],
			mClick: this.mouseOver && this.clicked[1],
			rClick: this.mouseOver && this.clicked[2],
			lDown: this.mouseOver && this.buttons[0],
			mDown: this.mouseOver && this.buttons[1],
			rDown: this.mouseOver && this.buttons[2],
			click: this.mouseOver && this.clicked.max(),
			down: this.mouseOver && this.buttons.max(),
			over: this.mouseOver,
			drag: (this.mouseOver && this.buttons.max()) ? this.delta : [0,0]
		}
	}
	window.IUIMouseEvent.prototype = Array.prototype

	window.IUIPersist = function IUIPersist(def = {}) {
		this.persist = def
		this.savedType = null
		
		this.reset = function () {
			this.persist = {}
			this.savedType = null
		}
		
		this.get = function(name,def) {
			if (this.persist[name] != undefined) {
				return this.persist[name]
			} else {
				return def
			}
		}
		
		this.set = function (name,value) {
			this.persist[name] = value
		}
	}
	
	docs.endObject()
	docs.construct("IUIWindowMan","",
		"A advanced utility for managmment of multiple windows. Contains functions for registering\n" + 
		"windows, a draw function and a taskbar draw function."
	)
	docs.func(".create","opt : Object, persist : IUIPersist = --new-- --IUIPersist()--,func : function = ()=>{}","window access (Object)",
		"Will create a new window with the options in the first argument. Function will be called after the\n"+
		"--.window-- function. If persist is a normal --Object-- it will be converted.\n\n" + 
		"The window access --Object-- contains:\n**" + 
		"opt : --Object-- //Provided options"
	)
	
	window.IUIWindowMan = function() {
		this.windows = []
		this.create = function(opt,persist = new IUIPersist(),func = ()=>{}) {
			if (!(persist instanceof IUIPersist)) {
				var persist = new IUIPersist(persist)
			}
			var save = {opt:opt,persist:persist,func:func}
			save.id = this.windows.push(save) - 1
			var winl = this.windows
			save.remove = function() {
				winl.splice(save.id,1)
			}
			save.terminate = function() {
				save.persist.persist.terminated = true
			}
			save.close = function() {
				save.persist.persist.open = false
			}
			save.open = function() {
				save.persist.persist.open = true
			}
			return save
		}
		this.drawTaskbar = function(pos,size,color,textColor,gui) {
			var main = gui.rect({color:color,pos:pos,size:size})
			var width = Math.min(100,size[0] / this.windows.length)
			this.windows.forEach((v,i)=>{
				var txt = v.opt.label || "UNDEFINED"
				if (main.iui.ctx.measureText(20,txt).width > width) {
					let len = txt.length
					while (true) {
						let nTxt = txt.split("").slice(0,len).join("") + "..."
						if (main.iui.ctx.measureText(20,nTxt).width <= width || len <= 0) {
							txt = nTxt
							break
						}
						len--
					}
				}
				var cli = main.button({pos:[i * (width + 10),0],size:[width,size[1]],textHeight:20,color:color.add(colors.darkGrey),textColor:textColor,txt:txt}).test.lClick
				if (cli) {v.persist.persist.open = !v.persist.persist.open}
			})
		}
		this.drawWindows = function(gui) {
			this.windows.forEach((v)=>{
				v.opt.persist = v.persist
				gui.window(v.opt)
				var slave = new IUIObject()
				slave.pos = gui.pos.add(v.persist.persist.pos)
				slave.iui = gui.iui
				if (v.opt.persist.get("open",true)) {
					v.func(slave,v)
				}
				if (v.opt.persist.get("terminated")) {
					v.remove()
					this.windows.forEach((v,i)=>{
						v.id = i
					})
				}
			})
		}
		this.openDialog = function(name = "alert",gui,...args) {
			const dialogs = {
				alert: (resolve,label,txt)=>{
					var per = this.create({label:label,size:[300,100]},{pos:[Math.floor(Math.random() * gui.iui.ctx.getSize()[0]),Math.floor(Math.random() * gui.iui.ctx.getSize()[1])]},(gui,v)=>{
						gui.text({txt:txt,pos:[20,50],textHeight:20})
						var butt = gui.button({pos:[120,60],size:[60,30],txt:"OK",color:colors.grey})
						if (butt.test.lClick) {
							v.terminate()
							resolve(true)
						}
					})
				}
			}
			if (dialogs[name]) {
				return new Promise((resolve)=>{
					dialogs[name](resolve,...args)
				})
			} else {
				throw new Error("Dialog '" + name + "'does not exsist")
			}
		}
	}
	return window
})

