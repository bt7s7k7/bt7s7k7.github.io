console.group("Init")
B = {}
B.isWorker = typeof document == "undefined" || typeof window == "undefined"
var hadScriptError = false
if (B.isWorker) {
	
	B.ready = false
	B.parentUrl = null
	onmessage = (msg)=>{
		var data = msg.data;
		if (typeof data != "object") {
			throw new TypeError("[BWorker] Worker only accepts objects as message data.")
		}
		var messages = {
			init: ()=>{
				B.ready = true
				B.parentUrl = data.url	
			},
			exe: ()=>{
				var ret = null
				var status = (st)=>{
					postMessage({type:"status",uid:data.uid,status:st})
				}
				try {
					var ret = eval(data.func)(data.data)
				} catch (err) {
					err.message = "[BWorker] " + err.message
					throw err
				} finally {
					postMessage({type:"return",uid:data.uid,data:ret})
				}
			}
		}
		if (messages[data.type]) {
			messages[data.type]()
		} else {
			throw new Error("[Internal bUtils error] 'unknown_async_worker_msg_type_"+ data.type +"'\nPlease contact the devs.")
		}
	}
} else {
	B.keys = {}
	B.pathTo = document.currentScript.src.split("/").slice(0,-1).join("/")
	B.src = document.currentScript.src
	B.worker = {
		reference: new Worker(B.src),
		execute: function (func,data = {}) {
			var uid = this.exeQueue.length
			this.reference.postMessage({type:"exe",func:func.toString(),data:data,uid:uid})
			var prom = new Promise((resolve,reject)=>{
				this.exeQueue[uid] = resolve
			})
			this.exeQueue[uid].prom = prom
			return prom
		},
		exeQueue : []	
	}
	B.worker.reference.postMessage({type:"init",url:location.href.split("/").slice(0,-1).join("/")})
	B.worker.reference.onmessage = (msg)=>{
		var data = msg.data
		var messages = {
			"return": ()=>{
				if (B.worker.exeQueue[data.uid]) {
					var extract = B.worker.exeQueue.splice(data.uid,1)[0](data.data || {})
				}
			},
			"status": ()=>{
				if (B.worker.exeQueue[data.uid]) {
					B.worker.exeQueue[data.uid].prom.status = data.status
				}
			}
		}
		if (messages[data.type]) {
			messages[data.type]()
		} else {
			throw new Error("[Internal bUtils error] 'unknown_async_host_msg_type_"+ data.type +"'\nPlease contact the devs.")
		}
	}
	
	B.lStorage = {}
	B.sincE = []
	B.sincECheck = []
	B.l = {}

	try {
		B.lStorage = JSON.parse(localStorage[window.location.pathname + ":bData"])
	} catch(err) {
		B.lStorage = {sinc:{},data:{}}
	}
	B.l = B.lStorage.data

	B.get = []
	if (!location.search.substring(1) == "") {
		var serch = location.search.substring(1).split("&")
		for (i=0;i<serch.length;i++) {
			var explo = serch[i].split("=")
			B.get[explo[0]] = explo[1]
		}
	}

	B.updateInterval = true

	window.onload = function(){
		
		document.body.addEventListener("keydown",event=>{
			B.keys[event.key] = true
		})
		document.body.addEventListener("keyup",event=>{
			B.keys[event.key] = false
		})
		
		var updateFunc = (auto)=>{
			if (!hadScriptError) {
				requestAnimationFrame(updateFunc)
			}
			var end = 0.0
			var err
			var start = performance.now()
			if (window.update && (B.updateInterval || auto)) {
				try {
					update()
				} catch (err_) {
					err = err_
				}
			}
			end = performance.now()
			B.renderTime = end - start
			B.fps = 1000 / B.renderTime
			
			if (err) {
				hadScriptError = true
				throw err
			}
			return B.renderTime
		}
		
		B.updateOnce = ()=>{
			return updateFunc(true)
		}
		B.module.refresh()
		B.module.list.forEach((v)=>{
			if (v.dependComplete < v.depend.length) {
				console.group("")
				console.error(((B.isWorker) ? "<W>" : "") + "[BModule] Module '" + v.name + "' is missing its required modules")
				hadScriptError = true
				v.depend.forEach((d)=>{
					if (d instanceof Array) {
						console.error("  " + d[0] + " v" + d[1])
					} else {
						console.error("  " + d)
					}
				})
				console.groupEnd("")
			}
		})
		B.pageLoaded = true
		B.reload()
		if (!hadScriptError) {
			setTimeout(requestAnimationFrame,10,updateFunc)
			if (window.setup) {
				try {
					setup()
				} catch(err) {
					err.name = "[Setup] " + err.name
					throw err
				}
			}

		}
		console.groupEnd("Init")
	}

	window.onunload = function () {
		var error = false
		try {
			if (window.exit) {
				exit()
			}
		} catch (err) {
			error = err
		}
		
		for (i = 0;i < B.sincE.length;i++) {
			B.lStorage.sinc[B.sincE[i].id] = B.sincE[i].value
		}
		
		for (i = 0;i < B.sincECheck.length;i++) {
			if (B.sincECheck[i].checked) {
				B.lStorage.sinc[B.sincECheck[i].id] = "true"
			} else {
				B.lStorage.sinc[B.sincECheck[i].id] = "false"
			}
		} 
		
		localStorage[window.location.pathname + ":bData"] = JSON.stringify(B.lStorage)
		if (error) {
			hadScriptError = true
			throw error
		}
	}
	

	B.swap = function(e1,e2) {
		var v1 = e1.hidden
		var v2 = e2.hidden
		if (!v1 && v2) {
			e1.hidden = true
			e2.hidden = false
		} else if (v1 && !v2) {
			e1.hidden = false
			e2.hidden = true
		} else {
			e1.hidden = false
			e2.hidden = true
		}
	}

	B.reload = function() {
		E = {}
		var allE = document.getElementsByTagName("*")
		for (i = 0;i < allE.length;i++) {
			if (allE[i].id != "") {
				E[allE[i].id] = allE[i]
			}
			
		} 
		if (document.getElementsByTagName("canvas")[0] != undefined) {
			B.canvas = document.getElementsByTagName("canvas")[0].getContext("2d")
		} else {
			B.canvas = undefined
		}
		return E
	}

	B.sinc = function(thing) {
		if (typeof B.lStorage.sinc[thing.id] != "undefined") {
			thing.value = B.lStorage.sinc[thing.id]
		}
		B.sincE.push(thing)
	}

	B.sincCheck = function(thing) {
		if (B.lStorage.sinc[thing.id] != undefined) {
			if (B.lStorage.sinc[thing.id] == "true") {
				thing.checked = true
			} else {
				thing.checked = false
			}
		}
		B.sincECheck.push(thing)
	}

	window.onkeydown = function(event) {
		if (window.onKey) {
			onKey(event)
		}
	}
	
	
}

B.parseOptions = function (object,defaults = {},required = []) {
	var object = Object.assign({},object)
	required.forEach((v)=>{
		if (object[v] == undefined) {
			throw new Error("Option value '" + v + "' is required")
		}
	})
	for (val in defaults) {
		if (object[val] == undefined) {
			object[val] = defaults[val]
		}
	}
	
	return object
}

B.module = {
	list: [],
	init: function (name,version,depend,init) {
		if (this.list[name] != undefined) {
			throw new Error(((B.isWorker) ? "<W>" : "") + "[BModule] Module '" + name + "' has aleready been registered")
		}
		var mod = {
			name:name,
			init:init,
			version:version,
			depend:depend,
			dependComplete:0,
			ready:false,
			toString:()=>{return name + " v" + version},
			data: null
		}
		
		
		if (depend.length > 0) {
			console.log(((B.isWorker) ? "<W>" : "") + "[BModule] Registered module '" + mod.toString() + "'")
		} else {
			console.log(((B.isWorker) ? "<W>" : "") + "[BModule] Registered module '" + mod.toString() + "' and it's ready")
			try {
				mod.data = mod.init()
				Object.assign(self,mod.data)
			} catch (err) {
				setTimeout(()=>{
					err.message = "[BModule] " + err.message
					hadScriptError = true
					throw err
				},0)
			}
			mod.ready = true
		}
		this.list.push(mod)
		this.list[name] = mod
		this.refresh()
	},
	formatedList: function() {
		return this.list.testForEach([],(a)=>{return a.toString()}).join("\n")
	},
	require: function (name,path){
		if (typeof path == "undefined") {
			path = B.pathTo + "/" + ((name.indexOf(".js") != -1) ? name : name + ".js")
		}
		if (typeof document != "undefined") {
			if (B.module.list[name] == undefined) {
				var script = document.createElement("script")
				script.src = path
				script.name = name
				document.head.appendChild(script)
			}
		} else {
			if (B.module.list[name] == undefined) {
				importScripts(B.parentUrl + "/" + path)
			}
		}
	},
	refresh: function() {
		this.list.forEach((source)=>{
			this.list.forEach((v)=>{
				v.depend.forEach((d)=>{
					if ((((d[0] == source.name || d[0] == source.name.split(".")[0]) && (d[1] <= source.version || d[0] == undefined)) || d == source.name) && source.ready) {
						v.dependComplete += 1
						d.loaded = true
					}
				})
				if (v.dependComplete >= v.depend.length && !v.ready) {
					try {
						v.data = v.init()
						Object.assign(self,v.data)
					} catch (err) {
						setTimeout(()=>{
							err.message = ((B.isWorker) ? "<W>" : "") + "[BModule] " + err.message
							hadScriptError = true
							throw err
						},0)
					}
					console.log(((B.isWorker) ? "<W>" : "") + "[BModule] Module '" + v.toString() + "' is ready")
					v.ready = true
					this.refresh()
				}
			})
		})
	},
	
}
B.module.init("bUtils",3,[],()=>{})
self.require = B.module.require
B.docs = {
	create: function (name,desc) {
		var doc = {
			name: name,
			desc: desc,
			module: null,
			documents: [],
			func: function (name,argDesc,type,desc = "") {
				var newName = name.split(".")
				newName[newName.length - 1] = "--" + newName[newName.length - 1] + "--"
				var uname = newName.join(".")
				if (type.indexOf("[") != -1 && type.indexOf("]") != -1) {
					var splitType = type.split("[")
					var type = "--" + splitType[0] + "--[--" + splitType[1].slice(0,-1) + "--]"
				} else if (type.indexOf("(") != -1 && type.indexOf(")") != -1) { 
					var splitType = type.split("(")
					var type = splitType[0] + "(--" + splitType[1].slice(0,-1) + "--)"
				} else {
					var type = "--" + type + "--"
				}
				var argDesc = argDesc.split(",").map((v)=>{
					var segments = v.split(":")
					if (segments.length <= 1) {
						return v
					}
					var equaled = false
					var retSec = segments[1].split("").map((v)=>{
						if ("[]()<>{}".indexOf(v) != -1 && !equaled) {
							return "--" + v + "--"
						} else if (v == "=" && !equaled) {
							equaled = true
							return "--" + v
						} else {
							return v
						}
					}).join("")
					return segments[0] + ": --" + retSec + ((!equaled) ? "--" : "")
				}).join(",")
				this.documents.push({
					name: name,
					type: type,
					usage: uname + "(" + argDesc + ") : " + type,
					desc: desc,
					type: 1,
					prop: doc.isProps
				})
			},
			prop: function (name,type,desc = "") {
				if (type.indexOf("[") != -1 && type.indexOf("]") != -1) {
					var splitType = type.split("[")
					var type = "--" + splitType[0] + "--[--" + splitType[1].slice(0,-1) + "--]"
				} else {
					var type = "--" + type + "--"
				}
				this.documents.push({
					name: name,
					type: type,
					usage: name + " = <" + type + ">",
					desc: desc,
					type: 0,
					prop: doc.isProps
				})
			},
			construct: function (name,argDesc,desc = "") {
				var argDesc = argDesc.split(",").map((v)=>{
					var segments = v.split(":")
					if (segments.length <= 1) {
						return v
					}
					var equaled = false
					var retSec = segments[1].split("").map((v)=>{
						if ("[]()<>{}".indexOf(v) != -1 && !equaled) {
							return "--" + v + "--"
						} else if (v == "=" && !equaled) {
							return "--" + v + "--"
						} else {
							return v
						}
					}).join("")
					return segments[0] + ": --" + retSec + "--"
				}).join(",")
				this.documents.push({
					name: name,
					type: name,
					usage: "--new-- --" + name + "--(" + argDesc + ")",
					desc: desc,
					type: 2,
					prop: doc.isProps
				})
				this.isProps = true
			},
			text: function (name,desc = "") {
				this.documents.push({
					name: name,
					type: "undefined",
					usage: "",
					desc: desc,
					type: 3,
					prop: doc.isProps
				})
			},
			endObject: function () {
				this.isProps = false
			},
			isProps: false,
			bindModule: function(module) {
				if (typeof module == "object") {
					this.module = module
				} else {
					this.module = B.module.list[module]
				}
			}
		}
		this.list.push(doc)
		return doc
	},
	list: [],
	build: function (element) {
		var buildCode = function(code,elem) {
			code.replace(" ",String.fromCharCode(8194)).split("--").forEach((c,i)=>{
				var span = document.createElement("span")
				if (i % 2 == 0) {
					span.style.color = "black"
				} else {
					if (c[0] + c[1] == "//") {
						span.style.color = "grey"
					} else if (parseFloat(c) == c) {
						span.style.color = "orange"
					} else if (["undefined","Infinity","null","true","false","prototype"].indexOf(c.removeWhitespace()) != -1) {
						span.style.color = "green"
					} else if (["function","if","else","else if","for","while","return","break","var","let","const","new"].indexOf(c.removeWhitespace()) != -1) {
						span.style.color = "#ff5555"
					} else {
						span.style.color = "#0055ff"
					}
				}
				/*
				span.style.color = (i % 2 == 0) ? "black" : (
					(c[0] + c[1] == "//") ? "grey" : (
						(parseFloat(c) == c) ? "orange" : (
							(["undefined","Infinity","null","true","false","prototype"].indexOf(c) != -1) ? "green" : (
								(["function","if","else","else if","for","while","return","break","var","let","const","new"].indexOf(c) != -1) ? "#ff5555" : "#0055ff"
							)
						)
					)
				)*/
				span.innerText = c
				span.style.whiteSpace = "pre"
				elem.appendChild(span)
			})
		}
		element.innerHTML = ""
		var span = document.createElement("span")
		this.list.forEach((v)=>{
			var h1 = document.createElement("h1")
			h1.id = v.name.split(".")[0]
			h1.onclick = ()=>{location.hash = v.name.split(".")[0]}
			h1.innerText = v.name
			var desc = document.createElement("span")
			desc.innerText = v.desc
			span.appendChild(h1)
			if (v.module) {
				var modInfo = document.createElement("div")
				modInfo.style.color = "grey"
				modInfo.innerText = v.module.toString() + " (Requires: " + v.module.depend.map((d)=>{return d[0] + " v" + d[1]}).join(", ") + ")"
				span.appendChild(modInfo)
			}
			span.appendChild(desc)
			v.documents.forEach((v)=>{
				var group = document.createElement("span")
				var h3 = document.createElement("h3")
				var i = document.createElement("i")
				var name = document.createElement("span")
				var code = document.createElement("code")
				var desc = document.createElement("span")
				i.innerText = ((v.type == 0) ? "VARIABLE " : ((v.type == 1) ? "FUNCTION " : ((v.type == 2) ? "CONSTRUCTOR " : "")))
				i.style = "font-weight: normal"
				name.innerText = v.name
				buildCode(v.usage,code)
				code.style = "background-color: #eeeeee; padding: 10px 10px 10px 10px; margin:10px 10px 10px 10px; display:block"
				code.style.width += window.innerWidth - ((v.prop) ? (100 + 50) : 100) + "px"
				group.style.position = "relative"
				group.style.left = ((v.prop) ? "50px" : "0px")
				group.style.width = "0px"
				v.desc.split("**").forEach((b,i)=>{
					if (i % 2 != 0 ) {
						var elm = document.createElement("code")
						elm.style = "background-color: #eeeeee; padding: 10px 10px 10px 10px; display:block"
						elm.style.width = window.innerWidth - ((v.prop) ? (90 + 50) : 90) + "px"
						buildCode(b,elm)
						desc.appendChild(elm)
					} else {
						buildCode(b,desc)
					}
				})
				h3.appendChild(i)
				h3.appendChild(name)
				span.appendChild(group)
				group.appendChild(h3)
				if (v.usage.length > 0) {
					group.appendChild(code)
				}
				group.appendChild(desc)
			})
		})
		element.appendChild(span)
	}
}

B.timedCall = function(func,...args) {
	var begin = 0
	var end = 0
	begin = performance.now()
	func(...args)
	end = performance.now()
	return end - begin
}

B.saveFile = function(src,name = "") {
	var a = document.createElement("a")
	a.download = name
	a.href = src
	a.click()
}

//-----------------------------------------------------------------------------------------------------------------------------------------------------
//                                                                 PROTOTYPES
//-----------------------------------------------------------------------------------------------------------------------------------------------------
B.module.init("prototypes",1.003,[],()=>{})

Array.prototype.add = function(second) {
	var ret = []
	this.forEach((thing,i)=>{
		ret.push(thing + second[i])
	})
	
	return ret;
}

Array.prototype.mul = function (mult) {
	var ret = []
	this.forEach((num)=>{
		ret.push(num * mult)
	})
	
	return ret
}

Array.prototype.scale = function (b) {
	var ret = []
	this.forEach((v,i)=>{
		ret.push(v * b[i])
	})
	return ret
}

Array.prototype.antiscale = function (b) {
	var ret = []
	this.forEach((v,i)=>{
		ret.push(v / b[i])
	})
	return ret
}

Array.prototype.size = function() {
	var preSize = 0
	this.forEach((v)=>{
		preSize += Math.abs(v * v)
	})
	return Math.sqrt(preSize)
}

Array.prototype.normalize = function () {
	var ret = []
	
	this.forEach((v)=>{
		ret.push(v / this.size())
	})
	
	return ret
}

Array.prototype.to2D = function() {
	return [this[0],this[2]]
}
Array.prototype.to3D = function() {
	return [this[0],0,this[1]]
}

Array.prototype.dist = function(target) {
	return Math.hypot(this[0] - target[0],this[1] - target[1])
}

Array.prototype.dist3d = function(target) {
	var dx = this[0] - target[0];
    var dy = this[1] - target[1];
    var dz = this[2] - target[2];

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

Array.prototype.equals = function(second) {
	var same = true
	this.forEach((v,i)=>{
		if (v != second[i]) {
			same = false
		}
	})
	return same
}

Array.prototype.dot = function (second) {
	var a = 0
	this.forEach((v,i)=>{
		a += v * second[i]
	})
	return a
}

Array.prototype.cross = function (second) {
	if (this.length != 3) {throw "This is an 3D operation"}
	var ret = []
	var a = this
	var b = second
	ret.push(a[1] * b[2] - a[2] * b[1])
	ret.push(a[2] * b[0] - a[0] * b[2])
	ret.push(a[0] * b[1] - a[1] * b[0])
	return ret
}

Array.prototype.copyTo = function(target) {
	target.length = 0
	this.forEach((v)=>{
		target.push(v)
	})
	return target
}

Array.prototype.clone = function() {
	var ret = []
	this.forEach((v)=>{
		ret.push(v)
	})
	return ret
}

Array.prototype.equals = function(second) {
	var equals = this.length == second.length
	this.forEach((v,i)=>{
		equals = equals && (v == second[i])
	})
	return equals
}
Array.prototype.eq = Array.prototype.equals

Array.prototype.lt = function(second) {
	var equals = this.length == second.length
	this.forEach((v,i)=>{
		equals = equals && (v < second[i])
	})
	return equals
}

Array.prototype.gt = function(second) {
	var equals = this.length == second.length
	this.forEach((v,i)=>{
		equals = equals && (v > second[i])
	})
	return equals
}

Array.prototype.lte = function(second) {
	var equals = this.length == second.length
	this.forEach((v,i)=>{
		equals = equals && (v <= second[i])
	})
	return equals
}

Array.prototype.gte = function(second) {
	var equals = this.length == second.length
	this.forEach((v,i)=>{
		equals = equals && (v >= second[i])
	})
	return equals
}

Array.prototype.max = function () {
	var max = -Infinity
	this.forEach((v)=>{
		max = Math.max(max,v)
	})
	return max
}

Array.prototype.min = function () {
	var max = Infinity
	this.forEach((v)=>{
		max = Math.min(max,v)
	})
	return max
}

Array.prototype.sum = function () {
	var ret = 0
	this.forEach((v)=>{
		ret += v
	})
	return ret
}

Array.prototype.average = function () {
	return this.sum / this.length
}

Array.prototype.and = function (b) {
	var ret = []
	this.forEach((v,i)=>{
		ret.push(v && b[i])
	})
	return ret
}
Array.prototype.or = function (b) {
	var ret = []
	this.forEach((v,i)=>{
		ret.push(v || b[i])
	})
	return ret
}
Array.prototype.xor = function (b) {
	var ret = []
	this.forEach((v,i)=>{
		ret.push(v != b[i])
	})
	return ret
}

Array.makeArrayLike = function (target) {
	target.prototype = Array.prototype
	target.length = 0
	return target
}

Array.prototype.testForEach = function (b,call) {
	var ret = []
	this.forEach((v,i)=>{
		ret.push(call(v,b[i]))
	})
	return ret
}

Array.getFilled = function(len,con = null) {
	var ret = []
	for (var i = 0;i < len;i++) {
		if (typeof con == "function") {
			ret.push(con(i))
		} else {
			ret.push(con)
		}
		
	}
	return ret
}

Array.prototype.random = function() {
	return this[Math.floor(Math.random() * (this.length))]
}



Object.defineProperty(Array.prototype,"x",{get:function(){return this[0]},set:function(val){this[0] = val;return value}})
Object.defineProperty(Array.prototype,"y",{get:function(){return this[1]},set:function(val){this[1] = val;return value}})
Object.defineProperty(Array.prototype,"z",{get:function(){return this[2]},set:function(val){this[2] = val;return value}})

Object.defineProperty(Array.prototype,"r",{get:function(){return this[0]},set:function(val){this[0] = val;return value}})
Object.defineProperty(Array.prototype,"g",{get:function(){return this[1]},set:function(val){this[1] = val;return value}})
Object.defineProperty(Array.prototype,"b",{get:function(){return this[2]},set:function(val){this[2] = val;return value}})

Number.prototype.notNaN = function() {
	if (isNaN(this)) {
		return 0
	} else {
		return this
	}
}

Number.prototype.between = function(first,second) {
	return this <= Math.max(first,second) && this >= Math.min(first,second)
}

Number.prototype.clamp = function (min,max) {
	var ret = this
	if (ret < min) {ret = min}
	if (ret > max) {ret = max}
	return ret
}

Number.prototype.overflow = function (min,max) {
	var ret = this
	if (ret < min) {ret = max}
	if (ret > max) {ret = min}
	return ret
}

Number.prototype.segment = function (amount = 1) {
	return Array.getFilled(amount,this / amount).map((v,i)=>{return v * (i + 1)})
}

var oldTS = Number.prototype.toString
Number.prototype.toString = function(radix = 10,length = 0) {
	var ret = oldTS.apply(this,[radix])
	if (ret.length < length) {
		var arr = ret.replace("-","").split("")
		arr.reverse()
		arr = arr.concat(Array.getFilled(length,"0"))
		arr.length = length
		arr.reverse()
		ret = ((this < 0) ? "-" : "") + arr.join("")
	}
	return ret
}

Math.__oldRandom__ = Math.random
Math.random = function (max,floor) {
	var rand = Math.__oldRandom__()
	if (max == undefined) {
		return rand
	}
	rand = rand * max
	if (floor) {
		rand = Math.floor(rand)
	}
	return rand
}
Math.randomInt = function (max) {
	return Math.random(max,true);
}

colors = {
	red : [255,0,0],
	darkRed : [127,0,0],
	blue : [0,0,255],
	darkBlue : [0,0,127],
	green : [0,255,0],
	darkGreen : [0,127,0],
	yellow : [255,255,0],
	darkYellow : [127,127,0],
	aqua : [0,255,255],
	pink : [255,0,255],
	white : [255,255,255],
	black : [0,0,0],
	fromHex : function(hex) {
		var hexs = hex.substr(1).split("")
		return [parseInt(hexs[0] + hexs[1],16),parseInt(hexs[2] + hexs[3],16),parseInt(hexs[4] + hexs[5],16)]
	},
	gray: [127,127,127],
	grey: [127,127,127],
	darkGrey: [63,63,63],
	voidGrey: [31,31,31],
	lightGrey: [191,191,191],
	orange: [255,127,0],
	softGreen: [0, 50, 50],
	notepad: [11,22,29],
	brown: [195,104,0]
}

vector = {
	fromString: function(str) {
		var data = str.split(",")
		var ret = []
		data.forEach((v)=>{
			ret.push(parseFloat(v))
		})
		return ret
	},
	fromObject: function(object,member) {
		return [object[member + "X"],object[member + "Y"]];
	},
	lerp: function (start,end,fraction) {
		var diff = start.add(end.mul(-1))
		return start.add(diff.mul(-fraction))
	},
	fromAngle: function (a) {
		return [Math.sin(a),Math.cos(a)]
	}
}

shapes = {
	rect: function (pos,size) {
		return {
			type: "rect",
			pos : pos,
			size : size,
			volume : size[0] * size [1],
			circumference : (size[0] + size [1]) * 2,
			testPoint : function (pos) {
				return pos.gte(this.pos) && pos.lte(this.pos.add(this.size))
			},
			edges : [
				pos,
				pos.add([0,size[1]]),
				pos.add([size[1],0]),
				pos.add(size)
			],
			testRect : function (b,isSecond) {
				var match = false
				b.edges.forEach((v)=>{
					match = match || this.testPoint(v)
				})
				if (!isSecond) {
					match = match || b.testRect(this,true)
				}
				return match
			},
			testCircle : function (b) {
				var match = false
				this.edges.forEach((v)=>{
					match = match || (v.dist(b.pos) <= b.radius)
				})
				match = match || this.testPoint(b.pos)
				return match
			},
			layer: 0
		}
	},
	circle: function (pos,radius) {
		return {
			type: "circle",
			radius: radius,
			pos: pos,
			circumference: 2 * radius * Math.PI,
			volume: radius * radius * Math.PI,
			testCircle: function (b) {
				return this.pos.dist(b.pos) <= Math.min(this.radius,b.radius)
			},
			testRect: function (b) {
				return b.testCircle(this)
			},
			testPoint: function(pos) {
				return pos.dist(this.pos) <= this.radius
			},
			layer: 0
		}
	},
	world: function () {
		return {
			objects: [],
			testCircle: function (c,layer = [0]) {
				var ret = []
				this.objects.forEach(v=>{
					if (v.testCircle(c) && layer.indexOf(v.layer) != -1) {
						ret.push(v)
					}
				})
				return ret
			},
			testPoint: function (c,layer = [0]) {
				var ret = []
				this.objects.forEach(v=>{
					if (v.testPoint(c) && layer.indexOf(v.layer) != -1) {
						ret.push(v)
					}
				})
				return ret
			},
			testRect: function (c,layer = [0]) {
				var ret = []
				this.objects.forEach(v=>{
					if (v.testRect(c) && layer.indexOf(v.layer) != -1) {
						ret.push(v)
					}
				})
				return ret
			},
			raycast: function (pos,dir,max = 500,layer = [0],step = 0.1) {
				var dir = dir.normalize()
				var hit = null
				repeat(Math.ceil(max / step),i=>{
					var curr = i * step
					var test = pos.add(dir.mul(curr))
					var hits = this.testPoint(test,layer)
					var shape = hits[0]
					
					
					if (hits.length > 0) {
						hit = {
							shape,
							pos: test,
							dist: test.dist(pos)
						}
						return true
					}
					
				})
				return hit
			}
		}
	},
	pointGrid: function(size,mul = 1,offset = [0,0]) {
		var ret =  {
			type: "pointGrid",
			size,
			mul,
			offset,
			points: Array.getFilled(size[0] * size[1],false),
			get: function(pos) {
				var pos = pos.add(offset.mul(-1)).mul(1 / mul).map(v=>Math.floor(v))
				if (pos[0] >= size[0] || pos[0] < 0 || pos[1] >= size[1] || pos[1] < 0) return
				return ret.points[pos[0] + pos[1] * size[0]]
			},
			set: function (pos,val) {
				var pos = pos.add(offset.mul(-1)).mul(1 / mul)
				ret.points[pos[0] + pos[1] * size[0]] = val
			},
			testPoint: function (pos) {
				return ret.get(pos)
			},
			testRect: function (rect) {
				return shapes.rect(pos,[1,1].mul(mul)).testRect(rect)
			},
			testCircle: function (rect) {
				return shapes.rect(pos,[1,1].mul(mul)).testCircle(rect)
			},
			layer: 0
		}
		return ret
	}
}



repeat = function(times = 1,func) {
	for (var i = 0;i < times;i++) {
		if (func(i)) return
	}
}

ImageData.prototype.setPixel = function(pos,color = [255,255,255]) {
	var id = (pos[0] + pos[1] * this.width) * 4
	this.data[id + 0] = color[0]
	this.data[id + 1] = color[1]
	this.data[id + 2] = color[2]
	this.data[id + 3] = color[3] || 255
}

ImageData.prototype.getPixel = function(pos) {
	var id = (pos[0] + pos[1] * this.width) * 4
	return [this.data[id + 0],this.data[id + 1],this.data[id + 2]]
}

String.prototype.removeWhitespace = function () {
	return this.replace(/^\s*|\s*$/g,"")
}

Object.prototype.forEach = function(func) {
	Object.keys(this).forEach((v)=>{
		func(this[v],v,this)
	})
}

if (B.isWorker) {
	console.groupEnd("Init")
}