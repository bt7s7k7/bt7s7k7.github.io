B = {}
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
	try {
		setTimeout(setup,1)
	} catch (err) {}
	var updateFunc = (auto)=>{
		var end = 0.0
		var err
		var start = Date.now()
		if (window.update && (B.updateInterval || auto)) {
			try {
				update()
			} catch (err_) {
				err = err_
			}
		}
		end = Date.now()
		B.renderTime = end - start
		B.fps = 1000 / B.renderTime
		
		
		if (err) {
			throw err
		}
		return B.renderTime
	}
	setInterval(updateFunc,17)
	B.updateOnce = ()=>{
		return updateFunc(true)
	}
	B.module.refresh()
	B.module.list.forEach((v)=>{
		if (v.dependComplete < v.depend.length) {
			console.group("")
			console.error("[BModule] Module '" + v.name + "' is missing its required modules")
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
			throw new Error("[BModule] Module '" + name + "' has aleready been registered")
		}
		var mod = {
			name:name,
			init:init,
			version:version,
			depend:depend,
			dependComplete:0,
			ready:false,
			toString:()=>{return name + " v" + version}
		}
		
		
		if (depend.length > 0) {
			console.log("[BModule] Registered module '" + mod.toString() + "'")
		} else {
			console.log("[BModule] Registered module '" + mod.toString() + "' and it's ready")
			try {
				mod.init()
			} catch (err) {
				setTimeout(()=>{
					err.message = "[BModule] " + err.message
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
		if (this.list[name] == undefined) {
			var script = document.createElement("script")
			script.src = path
			script.name = name
			document.head.appendChild(script)
		}
	},
	refresh: function() {
		this.list.forEach((source)=>{
			this.list.forEach((v)=>{
				v.depend.forEach((d)=>{
					if (((d[0] == source.name && (d[1] <= source.version || d[0] == undefined)) || d == source.name) && source.ready) {
						v.dependComplete += 1
						d.loaded = true
					}
				})
				if (v.dependComplete >= v.depend.length && !v.ready) {
					try {
						v.init()
					} catch (err) {
						setTimeout(()=>{
							err.message = "[BModule] " + err.message
							throw err
						},0)
					}
					console.log("[BModule] Module '" + v.toString() + "' is ready")
					v.ready = true
				}
			})
		})
	}
}
B.module.init("bUtils",2,[],()=>{})