B = {};
if (typeof require == "undefined" && typeof self != "undefined" && typeof process == "undefined") {
	console.group("Init")
	B.isWorker = typeof document == "undefined" || typeof window == "undefined"
	var hadScriptError = false
	Object.assign(B,{
		get hadScriptError() {
			return hadScriptError
		},
		set hadScriptError(value) {
			return hadScriptError = value
		}
	})
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
		
		B.tick = 0
		B.globalValues = {}
		B.updateInterval = true
		B.elemOnUpdate = []
		window.onload = function(){ //@@@load
			Element.prototype.getSize = function() {
				var rect = this.getBoundingClientRect()
				return [rect.width,rect.height]
			}
			
			Element.prototype.setSize = function(size) {
				this.style.width = size[0] + "px"
				this.style.height = size[1] + "px"
				return this.getSize()
			}
			
			Element.prototype.setPos = function(pos) {
				this.style.position = "absolute"
				this.style.left = pos[0] + "px"
				this.style.top = pos[1] + "px"
			}
			
			Window.prototype.getSize = function() {
				return [this.innerWidth,this.innerHeight]
			}
			document.body.addEventListener("keydown",event=>{
				B.keys[event.key] = true
			})
			document.body.addEventListener("keyup",event=>{
				B.keys[event.key] = false
			})
			
			document.querySelectorAll("[globalValue]").forEach((v)=>{
				var eventFunc = (e)=>{
					choice(v.type,
						"text",()=>{
							B.globalValues[v.getAttribute("globalValue")] = v.value
						},
						"color",()=>{
							B.globalValues[v.getAttribute("globalValue")] = colors.fromHex(v.value)
						},
						"number",()=>{
							B.globalValues[v.getAttribute("globalValue")] = parseFloat(v.value)
						},
						"checkbox",()=>{
							B.globalValues[v.getAttribute("globalValue")] = v.checked
						},
						()=>{
							B.globalValues[v.getAttribute("globalValue")] = v.value
						}
					)
				}
				v.addEventListener("change",eventFunc)
				eventFunc()
			})
			
			var updateFunc = (auto)=>{//@@@update
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
				B.tick += 1
				B.tick = B.tick % Number.MAX_SAFE_INTEGER
				B.fps = 1000 / B.renderTime
				B.elemOnUpdate.forEach(v=>{
					var func = new Function (v.getAttribute("onupdate"))
					try {
						func.apply(v,[])
					} catch (err) {
						console.error(err.stack)
					}
					
				})
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
			var dependant = {}
			document.querySelectorAll("[dependElement][dependValue]").forEach(v=>{
				var id = v.getAttribute("dependElement")
				var value = v.getAttribute("dependValue")
				if (!dependant[id]) dependant[id] = []
				dependant[id].push({value:value,element:v})
				v.hidden = value != E[id].value
			})
			
			document.querySelectorAll("[dependSource]").forEach((v)=>{
				v.addEventListener("change",()=>{
					dependant[v.id].forEach(elem=>{
						elem.element.hidden = elem.value != v.value
					})
				})
			})
			
			document.querySelectorAll("[onupdate]").forEach((v)=>{
				B.elemOnUpdate.push(v)
			})
			
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
					mod.data = mod.init({})
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
	
	B.module.init("bUtils",4,[],()=>{})
	B.module.init("prototypes",1.003,[],()=>{})
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

	B.saveFile = function(src,name = "") {
		var a = document.createElement("a")
		a.download = name
		a.href = src
		a.click()
	}
	
	B.loadFile = function(acceptString = "image/*",multiple = false) {
		return new Promise((resolve,reject)=>{
			var input = document.createElement("input")
			input.type = "file"
			input.accept = acceptString
			input.multiple = multiple
			input.onchange = function(event) {
				var files = [...input.files]
				if (input.value == "") {
					reject([])
				} else {
					resolve(files)
				}
			}
			input.click()
		})
	}
	
	B.createForm = function(element,fields,submitText = "OK") {
		/* @@@createForm
			[
				name: "Address",
				type: "text", || text,number,selection(values),none (writes just the name),thruth
				optional options: [
					...<strings>
				] || if selection
				optional range: {
					max: 10,
					min: 0,
					step: 1
				} || if number && if want ("slider")
				value: "www.go"
				id: "addr" = this.name
			]
		*/
		//console.log(element.childNodes);
	
		[...element.childNodes].clone().forEach((v)=>{
			//console.log(v)
			element.removeChild(v)
		})
		var parseFunc = function() {
			var ret = {}
			fields.forEach((v,i)=>{
				var elem = element.querySelector("[name=\""+ v.id +"\"]")
				choice(v.type,
					"text",()=>{
						ret[v.id || v.name] = elem.getElementsByTagName("input")[0].value
					},
					"thruth",()=>{
						ret[v.id || v.name] = elem.getElementsByTagName("input")[0].checked
					},
					"selection",()=>{
						ret[v.id || v.name] = elem.getElementsByTagName("select")[0].value
					},
					"number",()=>{
						ret[v.id || v.name] = parseFloat(elem.getElementsByTagName("input")[0].value)
					},
					"none",()=>{
						
					}
				)
			})
			return ret
		}
		fields.forEach((v,i)=>{
			
			
			var span = document.createElement("span")
			var br = document.createElement("br")
			span.innerText = v.name + ": "
			span.setAttribute("name",v.id)
			
			choice(v.type,
				"text",()=>{
					var input = document.createElement("input")
					input.value = v.value
					input.type = "text"
					
					input.onchange = function () {
						changeFunc(parseFunc())
					}
					
					span.appendChild(input)
				},
				"thruth",()=>{
					var input = document.createElement("input")
					input.checked = v.value
					input.type = "checkbox"
					
					input.onchange = function () {
						changeFunc(parseFunc())
					}
					
					span.appendChild(input)
				},
				"number",()=>{
					var input = document.createElement("input")
					input.value = v.value
					input.type = (v.range) ? "range" : "number"
										
					input.onchange = function () {
						changeFunc(parseFunc())
					}

					if (v.range) {
						input.min = v.range.min
						input.max = v.range.max
						input.step = v.range.step
					}
					
					span.appendChild(input)
				},
				"selection",()=>{
					var select = document.createElement("select")					
					select.onchange = function () {
						changeFunc(parseFunc())
					}

					v.options.forEach((v)=>{
						var option = document.createElement("option")
						option.innerText = v
						select.appendChild(option)
					})
					select.value = v.value
					span.appendChild(select)
				},
				"none",()=>{},
				()=>{
					throw new Error("Invalid value type")
				}
			)
			
			span.appendChild(br)
			element.appendChild(span)
		})
		
		var button = document.createElement("button")
		button.innerText = submitText
		element.appendChild(button)
		
		var promise = new Promise((resolve)=>{
			button.onclick = function() {
				resolve(parseFunc())
			}
		})
		var ret = {}
		var changeFunc = ()=>{}
		ret.change = function(func) {
			changeFunc = func
			return this
		}
		ret.then = function(func) {
			promise.then(func)
			return this
		}
		return ret
	}
	
	B.formify = function(element,object,buttonText = "OK",repeat = false,callback = ()=>{}) {
		var formFields = []
		object.forEach((v,i)=>{
			if (i[0] == "$") return
			choice(typeof v,
				"number",()=>{
					formFields.push({
						name: i.firstUpper(),
						id: i,
						value: v,
						type: "number"
					})
				},
				"string", ()=>{
					if ("$" + i in object && object["$" + i] instanceof Array) {
						formFields.push({
							name: i.firstUpper(),
							id: i,
							value: v,
							type: "selection",
							options: object["$" + i]
						})
					} else {
						formFields.push({
							name: i.firstUpper(),
							id: i,
							value: v,
							type: "text"
						})
					}
				},
				"boolean", ()=>{
					formFields.push({
						name: i.firstUpper(),
						id: i,
						value: v,
						type: "thruth"
					})
				}
			)
		})
		
		B.createForm(element,formFields,buttonText).then((data)=>{
			data.forEach((v,i)=>{
				object[i] = v
			})
			callback(data)
			if (repeat) B.formify(element,object,buttonText,repeat,callback)
		})
	}
} else {
	// @@@node
	B.isNode = true
	if (typeof module == "object") {
		module.exports = B
	} else {
		console.log("bUtils is a module. Please use require from a node.js script.")
	}
	var util = require("util")
	var readline = require("readline")
	var chalk = require("chalk")
	var fs = require("fs")
	var path = require("path")
	B.chalk = chalk
	process.on("exit",()=>{
		B.write("\u001b[37m")
	})
	
	var defDataFuntion = (chunk)=>{
		B.io.ondata((B.io.raw) ? chunk : chunk.toString().slice(0,-2))
	}
	
	process.stdout.on("resize",()=>{
		B.io.onresize(B.io.getSize())
	})

	B.io = {
		write: function(thing = "") {
			var txt = (typeof thing == "string") ? thing : util.inspect(thing,{colors: true,depth: null})
			process.stdout.write(txt);
			return txt.length
		},
		log: function(...things) {
			things.forEach((thing,i,a)=>{
				B.io.write(thing)
				if (i < a.length - 1) B.io.write(", ")
			})
			
			B.io.write("\n")
		},
		clear: function () {B.io.write("\033c")},
		ondata: ()=>{},
		onresize: ()=>{},
		begin: function(callback,raw = B.io.raw) {
			process.stdin.resume()
			if (process.stdin.listeners("data").indexOf(defDataFuntion) == -1) process.stdin.on("data",defDataFuntion)
			this.ondata = callback || this.ondata
			this.raw = raw
		},
		end: function () {
			process.stdin.pause()
			process.stdin.removeListener("data",defDataFuntion)
			setTimeout(()=>{},100)
		},
		get raw() {
			return process.stdin.isRaw
		},
		set raw(mode) {
			process.stdin.setRawMode(mode)
		},
		readline: function(callback,prompt = "") {
			B.io.end()
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			})
			rl.question(prompt,(data)=>{
				callback(data)
				rl.close()
				B.io.begin(B.io.ondata,B.io.raw)
			})
		},
		getSize: function() {
			return [process.stdout.columns,process.stdout.rows]
		},
		setCursor: function(pos) {
			readline.cursorTo(process.stdout,...pos)
		},
		moveCursor: function (offset) {
			readline.moveCursor(process.stdout,...offset)
		},
		clearLine: function () {
			readline.clearLine(process.stdout)
		},
		keys: {
			HOME: "\u001b[1",
			INSERT: "\u001b[2",
			DELETE: "\u001b[3",
			END: "\u001b[4",
			PAGE_UP: "\u001b[5",
			PAGE_DOWN: "\u001b[6",
			TAB: "\t",
			ENTER: "\r",
			UP: "\u001b[A",
			DOWN: "\u001b[B",
			RIGHT: "\u001b[C",
			LEFT: "\u001b[D",
			ESC: "\u001b",
			BACK: "\b",
			F1: "\u001b[[A",
			F2: "\u001b[[B",
			F3: "\u001b[[C",
			F4: "\u001b[[D",
			F5: "\u001b[[E",
			F6: "\u001b[17",
			F7: "\u001b[18",
			F8: "\u001b[19",
			F9: "\u001b[20",
			F10: "\u001b[21",
			F11: "\u001b[23",
			F12: "\u001b[24"
		}
	}
	Object.assign(B,{
		write: B.io.write,
		clear: B.io.clear,
		log: B.io.log,
		debug: B.io.log
	})
	
	B.args = {
		get: process.argv.slice(2,process.argv.length),
		parse: function (args,help) {
			ret = {}
			args.forEach((v,i)=>{
				if (B.args.get[i]) {
					ret[v.name] = B.args.get[i]
				} else {
					if (typeof v.def != "undefined") {
						ret[v.name] = v.def
					} else {
						if (!help) {
							help = "Usage: " + process.argv[1] + " " + args.map(v=>v.name).join(" ")
						}
						B.log(help)
						process.exit(9)
					}
				}
			})
			return ret
		},
		parseAdvanced: function (flags,help,dataLength) {
			var got = this.get
			var ret = {
				data: [],
				flags: {}
			}
			flags.forEach((v)=>ret.flags[v] = false)
			
			var doingFlags = true
			got.forEach(v=>{
				if (v[0] == "-") {
					if (doingFlags) {
						if (v[1] != "-") {
							var flag = flags.filter(w=>w[0] == v[2])[0]
							if (!flag) {
								B.log("Invalid flag '" + v.slice(1,Infinity) + "'")
								B.log(help)
								process.exit(9)
							}
						} else {
							var flag = v.slice(2,Infinity)
							if (flags.indexOf(flag) == -1) {
								B.log("Invalid flag '" + v.slice(2,Infinity) + "'")
								B.log(help)
								process.exit(9)
							}
						}
					} else {
						B.log("Unexpected flag after data")
						B.log(help)
						process.exit(9)
					}
					
					ret.flags[flag] = true
				} else {
					doingFlags = false
					ret.data.push(v)
				}
			})
			if (typeof dataLength == "number") {
				if (ret.data.length != dataLength) {
					if (ret.data.length < dataLength) {
						B.log("Too litle arguments")
						B.log(help)
						process.exit(9)
					} else {
						B.log("Too many arguments")
						B.log(help)
						process.exit(9)
					}
				}
			}
			return ret
		}
	}
	
	B.format = {
		middle: function(str) {
			var width = (B.io.getSize()[0] / 2).floor() - (str.length / 2).floor()
			B.write("\r")
			B.io.moveCursor([width,0])
			B.log(str)
		},
		middleVertical:function(textH) {
			var width = (B.io.getSize()[1] / 2).floor() - (textH / 2).floor()
			B.setCursor([0,width])
		},  
		pipes: {
			smooth: [
				["┌","─","┐"],
				["│"," ","│"],
				["└","─","┘"]
			],
			primitive: [
				["+","-","+"],
				["|"," ","|"],
				["+","-","+"]
			],
			bold: [
				["█","█","█"],
				["█"," ","█"],
				["█","█","█"]
			],
			boldPrimitive: [
				["#","#","#"],
				["#"," ","#"],
				["#","#","#"]
			],
			none: [
				[" "," "," "],
				[" "," "," "],
				[" "," "," "]
			],
		},
		rect: function(pos,size,_text = "",pipes = "smooth",textColor = "white",borderColor = "white") {
			var pipes = this.pipes[pipes]
			var text = _text.split("\n")
			if (typeof size == "string") {
				text = size.split("\n")
				size = [text.map((v)=>{return v.replace(/\u001b\[[^m]*m/g,"").length}).max() + 2,text.length + 2]
			}
			
			if (pos == "middle") {
				var pos = size.map((v,i)=>{
					return (B.io.getSize()[i] / 2).floor() - (v / 2).floor()
				})
			}
			
			B.io.setCursor(pos)
			if (!(borderColor in chalk)) throw new Error ("Color '" + borderColor + "' not avalible")
			else B.write(B.chalk[borderColor](pipes[0][0] + pipes[0][1].repeat(size[0] - 2) + pipes[0][2]))
			
			repeat(size[1] - 2,(i)=>{
				var curr = text[i] || ""
				B.io.setCursor(pos.add([0,i + 1]))
				B.write(B.chalk[borderColor](pipes[1][0]) + 
					B.chalk[textColor](curr + pipes[1][1].repeat(size[0] - 2 - curr.length)) + 
					B.chalk[borderColor](pipes[1][2])
				)
			})
			
			B.io.setCursor(pos.add([0,size[1] -1]))
			B.write(B.chalk[borderColor](pipes[2][0] + pipes[2][1].repeat(size[0] - 2) + pipes[2][2]))
		},
		createSelList: function(labels,size,confirmFunc = ()=>{},selectType = "color") {
			var list = {
				labels,selectType,confirmFunc,size,
				index: 0,
				scroll: 0,
				draw: function(pos) {
					list.labels.forEach((v,i)=>{
						var y = i - list.scroll
						if (y < 0) return
						if (y > list.size[1]) return
						B.io.setCursor([pos[0],pos[1] + y])
						if (i != list.index) {
							B.write(v + Array.getFilled(list.size[1] - v.length," ").join(""))
						} else {
							if (list.selectType == "color") {
								B.write(B.chalk.inverse(v + Array.getFilled(list.size[1] - v.length," ").join("")) + B.chalk.reset(""))
							} else if (list.selectType == "arrows") {
								B.write("> " + v + " <" + Array.getFilled(list.size[1] - v.length - 4," ").join(""))
							}
						}
						
					})
				},
				select: function (offset) {
					list.index = Math.overflow(list.index + offset,0,list.labels.length - 1)
					if (list.index < list.scroll) {
						list.scroll = list.index
					}
					if (list.index > list.scroll + list.size[1]) {
						list.scroll += list.index - (list.scroll + list.size[1])
					}
				},
				handleInput : function(input,upKey = B.io.keys.UP,downKey = B.io.keys.DOWN,confirm = B.io.keys.ENTER) {
					input = input.toString()
					if (input == upKey) {
						list.select(-1)
						return true
					} else if (input == downKey) {
						list.select(1)
						return true
					} else if (input == confirm) {
						list.confirmFunc(list.index)
						return true
					}
					return false
				}
			}
			
			return list
		}
	}
	B.getFilesRecursive = function (dir,callback) {
		async function readdir(dir,ret) {
			var [err,files] = await fs.readdir.promise(dir)
			if (err) throw err
			for (let i = 0;i < files.length;i++) {
				let path = require("path").join(dir,files[i])
				let [err,stats] = await fs.stat.promise(path)
				if (!err) {
					if (stats.isDirectory()) {
						await readdir(path,ret)
					} else if (stats.isFile()) {
						ret.push(path)
					}
				}
			}
		}
		var files = []
		readdir(dir,files).then(()=>{
			callback(null,files)
		}).catch((err)=>{
			callback(err,[])
		})
	}
	
	B.clearFolder = function (dir,callback) {
		async function main() {
			var [err,files] = await fs.readdir.promise(dir)
			if (err) throw err
			for (var i = 0;i < files.length;i++) {
				var [err] = await fs.unlink.promise(files[i])
			}
		}
		main().then((v)=>callback(null,v)).catch((err)=>callback(err,null))
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
//@@@stretch
B.spreadFunction = function(step,done,persist = {},stepTime = 17,updateFunc = ()=>{}) {
	var killed = false
	var iteration = 0
	var killFunc = function kill() {
		killed = true
	}
	var stepFunc = ()=>{
		var start = Date.now()
		while (true) {
			if (Date.now() - start > stepTime) {
				setTimeout(()=>stepFunc(),1)
				updateFunc(iteration,persist)
				return
			}
			step(iteration,persist,killFunc)
			iteration++
			if (killed) {
				done(iteration,persist)
				return
			}
		}
	}
	stepFunc()
	return {
		persist,
		kill: killFunc,
		get iteration() {
			return iteration
		}
	}
}

//-----------------------------------------------------------------------------------------------------------------------------------------------------
//                                                                 PROTOTYPES
//-----------------------------------------------------------------------------------------------------------------------------------------------------

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
	return Math.hypot(...this.map((v,i)=>{return v - target[i]}))
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
Array.prototype.maxI = function () {
	var max = -Infinity
	var ret = -1
	this.forEach((v,i)=>{
		max = Math.max(max,v)
		if (max == v) ret = i
	})
	return ret
}

Array.prototype.min = function () {
	var max = Infinity
	this.forEach((v)=>{
		max = Math.min(max,v)
	})
	return max
}
Array.prototype.minI = function () {
	var max = Infinity
	var ret = -1
	this.forEach((v,i)=>{
		max = Math.min(max,v)
		if (max == v) ret = i
	})
	return ret
}

Array.prototype.sum = function () {
	var ret = 0
	this.forEach((v)=>{
		ret += v
	})
	return ret
}

Array.prototype.average = function () {
	return this.sum() / this.length
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

Array.prototype.singleValue = function(func) {
	var curr = null
	this.forEach((v,i,a)=>{
		curr = func(curr,v,i,a)
	})
	return curr
}

Array.prototype.random = function() {
	return this[Math.floor(Math.random() * (this.length))]
}

Array.prototype.arr2d = function(width,pos,value) {
	var index = pos[0] + pos[1] * width
	if (typeof value != "undefined") {
		this[index] = value
		return value
	} else {
		return this[index]
	}
}

Array.prototype.floor = function() {
	return this.map(v=>v.floor())
}

Array.prototype.reflect = function (normal) {
	return this.add(normal.mul(2 * this.dot(normal) * -1))
}

Array.prototype.toAxis = function() {
	var axis = this.indexOf(this.map(v=>v.abs()).max())
	var ret = Array.getFilled(this.length,0)
	ret[axis] = this[axis] > 0 ? 1 : -1
	return ret
}

Array.prototype.last = function() {
	return this[this.length - 1]
}
Array.prototype.toAngle = function() {
	return Math.atan2(this[0],this[1])
}
Array.prototype.project = function(other) {
	var dot = this.dot(other)
	return [dot * other[0],dot * other[1]]
}

Array.lastOp = []
Array.prototype.begin = function() {
	Array.lastOp = this
	return this
}
Array.prototype.end = function() {
	this.copyTo(Array.lastOp)
	return Array.lastOp
}
Array.prototype.rotate = function(angle) {
	var myAngle = this.toAngle()
	var mag = this.size()
	
	return vector.fromAngle(myAngle).mul(mag)
}
Array.prototype.lerp = function (target,frac) {
	return this.map((v,i)=>v.lerp(target[i],frac))
}
Array.prototype.volume = function() {
	var ret = 1;
	this.forEach((v)=>{ret *= v});
	return ret;
}

Array.prototype.containsVector = function(vector) {
	return this.map((v)=>v.equals(vector)).sum() == 1
}
// @@@endArray
String.prototype.random = Array.prototype.random
String.prototype.firstUpper = function() {
	var ret = this.split("")
	ret[0] = ret[0].toUpperCase()
	return ret.join("")
}

String.prototype.escape = function () {
	return JSON.stringify(this)
}



/*Object.defineProperty(Array.prototype,"x",{get:function(){return this[0]},set:function(val){this[0] = val;return value}})
Object.defineProperty(Array.prototype,"y",{get:function(){return this[1]},set:function(val){this[1] = val;return value}})
Object.defineProperty(Array.prototype,"z",{get:function(){return this[2]},set:function(val){this[2] = val;return value}})

Object.defineProperty(Array.prototype,"r",{get:function(){return this[0]},set:function(val){this[0] = val;return value}})
Object.defineProperty(Array.prototype,"g",{get:function(){return this[1]},set:function(val){this[1] = val;return value}})
Object.defineProperty(Array.prototype,"b",{get:function(){return this[2]},set:function(val){this[2] = val;return value}})*/

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
Math.clamp = (num,...args)=>{return num.clamp(...args)}

Number.prototype.overflow = function (min,max) {
	var ret = this
	if (ret < min) {ret = max}
	if (ret > max) {ret = min}
	return ret
}
Math.overflow = function(number,...args) {
	return number.overflow(...args)
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
Number.prototype.toValid = function() {
	if (isNaN(this)) {
		return 0
	} else {
		return this.valueOf()
	}
}

Number.prototype.half = function() {
	return this / 2
}

Number.prototype.dist = function(second) {
	return (this - second).abs()
}

Number.prototype.lerp = function (target,frac) {
	return this + (target - this) * frac
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
Math.map = function(ret,currMin,currMax,newMin,newMax) {
	ret -= currMin
	currMax -= currMin
	newMax -= newMin
	ret *= newMax / currMax
	return ret + newMin
}

Math.fraction = function(begin,end,point) {
	return Math.map(point,begin,end,0,1)
}

Math.normalizeAngle = function(angle) {
	return angle.overflow(0,Math.PI * 2).valueOf()
}

colors = { // @@@colors
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
	brown: [195,104,0],
	purple: [127,0,255]
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
	// @@@fromAngle
	fromAngle: function (...a) {
		if (a.length == 1) {
			return [Math.sin(a[0]),Math.cos(a[0])]
		} else if (a.length == 2) {
			var [alpha,beta] = a
			return [
				Math.cos(alpha) * Math.cos(beta),
				Math.sin(beta),
				Math.sin(alpha) * Math.cos(beta)
			]
		} 
		
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

// @@@pathfind
shapes.world.pathfind = function(nodes,startNode,endNode) {
	var solvedNodes = []
	var used = [nodes[startNode]]
	var path = [nodes[startNode]]
	var backtracking = false
	var finalPath = []
	
	while (true) {
		let curr = path[path.length - 1]
		let conn = curr.conn.map((v)=>nodes[v]).filter((v)=>{
			return used.indexOf(v) == -1
		})
		
		if (curr == nodes[endNode]) {
			return path.map(v=>v.pos)
		}
		
		if (conn.length < 1) {
			if (!backtracking) {
				backtracking = true
			}
			if (finalPath.length < 1 || finalPath.last().pos.dist(nodes[endNode].pos) > curr.pos.dist(nodes[endNode].pos)) finalPath = path.clone()
			path.length -= 1
			if (path.length < 1) return finalPath.map(v=>v.pos)
			continue
		} else {
			backtracking = false
		}
		
		let closest = conn[conn.map((v)=>v.pos.dist(nodes[endNode].pos)).minI()]
		path.push(closest)
		used.push(closest)
	}
}

repeat = function(times = 1,func) {
	for (var i = 0;i < times;i++) {
		if (func(i,times)) return
	}
}
if (!B.isNode) {
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
	
	ImageData.prototype.fill = function(color) {
		repeat(this.width,(x)=>{
			repeat(this.height,(y)=>{
				this.setPixel([x,y],color)
			})
		})
		return this
	}
	
	ImageData.prototype.copy = function(image) {
		repeat(this.width,(x)=>{
			repeat(this.height,(y)=>{
				this.setPixel([x,y],image.getPixel([x,y]))
			})
		})
		return this
	}
	
	File.prototype.toString = function() {
		return new Promise((resolve)=>{
			var reader = new FileReader()
			reader.onload = function(data) {
				resolve(reader.result)
			}
			reader.readAsText(this)
		})
		
	}
	
	File.prototype.toDataURL = function() {
		return new Promise((resolve)=>{
			var reader = new FileReader()
			reader.onload = function(data) {
				resolve(reader.result)
			}
			reader.readAsDataURL(this)
		})
		
	}
		
	File.prototype.toArrayBuffer = function() {
		return new Promise((resolve)=>{
			var reader = new FileReader()
			reader.onload = function(data) {
				resolve(reader.result)
			}
			reader.readAsArrayBuffer(this)
		})
		
	}
	
	
} //@@@notNode

String.prototype.removeWhitespace = String.prototype.trim

String.prototype.repeat = function(num) {
	return Array.getFilled(num,this).join("")
}

Object.prototype.forEach = function(func) {
	Object.keys(this).forEach((v)=>{
		func(this[v],v,this)
	})
}

Object.prototype.map = function (func) {
	ret = {}
	this.forEach((v,i)=>{
		ret[i] = func(v,i)
	})
	return ret
}

Object.prototype.toArray = function () {
	ret = []
	this.forEach((v,i)=>{
		ret.push({key:i,value:v})
	})
	return ret
}

Object.prototype.transform = function (func) {
	return func(this)
}

if (B.isWorker) {
	console.groupEnd("Init")
}

Fraction = {prototype:{}}

function f(...args) {
	if (args.length == 3) {
		var full = args[0]
		var src = args[1]
		var div = args[2]
	} else if (args.length == 2) {
		var full = 0
		var src = args[0]
		var div = args[1]
	} else if (args.length == 1) {
		var full = args[0]
		var src = 0
		var div = 0
	} else {
		throw new Error ("2 or 3 args required.")
	}
	
	var ret = Object.create(Fraction.prototype)
	Object.assign(ret,{
		full,
		src,
		div
	})
	return ret
}

Fraction.prototype.toNumber = function() {
	return this.src / this.div + this.full
}

Fraction.prototype.toString = function() {
	if (this.full != 0) {
		return this.full.toString() + " " + this.src.toString() + "/" + this.div.toString()
	} else {
		return this.src.toString() + "/" + this.div.toString()
	}
}

Fraction.prototype.makeBasic = function() {
	var src = this.src + this.full * this.div
	var div = this.div
	
	src /= div
	div /= div
	
	var mul = 1 / src
	
	src *= mul
	div *= mul
	
	
	
	var full = Math.floor(src / div)
	src = src % div
	
	return f(full,src,div)
	
	/*
		4/20 --|
		  V    V
		{4,20} / 20 = {0.2,1}
		
		{0.2,1}
		  |--|
		     V
		1 / 0.2 = 5
		          V
		{0.2,1} * 5 = {1,5}
		                V
					>> 1/5 <<
					---------
					---------
		
		2155,5454  = 1/2.530858468677494
		
	*/
};

// @@@numberMath
["floor","ceil","round","abs","map"].forEach((v)=>{
	Number.prototype[v] = function(...args){
		return Math[v](this,...args)
	}
})

Function.prototype.repeat = function(num,...args) {
	repeat(num,()=>{this(...args)})
}

Function.prototype.promise = function(...args) {
	return new Promise(resolve=>{
		this(...args,(...secArgs)=>{
			resolve(secArgs)
		})
	})
}

choice = function choice (value,...choices) {
	var pairs = []
	var def
	choices.forEach((v,i,a)=>{
		if (i % 2 != 0) return
		if (i == a.length-1 && a.length % 2 != 0) {
			def = v
			return
		}
		pairs.push({
			value: v,
			func: a[i+1]
		})
	})
	var found = false
	pairs.forEach((v)=>{
		if (v.value == value) {
			found = true
			v.func()
		}
	})
	if (!found && typeof def == "function") def(value)
	return found
}

History = function History(maxLength,def) {
	this.maxLength = maxLength
	Array.prototype.push.apply(this,Array.getFilled(maxLength,def))
}
History.prototype = Object.create(Array.prototype)
History.prototype.add = function add(value) {
	this.shift()
	this.push(value)
}

console.__buffer = []
console.buffer = function (...things) {
	this.__buffer.push(things)
}
console.logBuffer = function() {
	var print = []
	this.__buffer.forEach((v,i,a)=>{
		print.push(...v)
		if (i < a.length - 1) {
			print.push("\n")
		}
	})
	this.__buffer.length = 0
	console.log(...print)
}

geometry = {
	testLineIntersect: function(p0,p1,p2,p3) {		
		var [p0_x,p0_y] = p0
		var [p1_x,p1_y] = p1
		var [p2_x,p2_y] = p2
		var [p3_x,p3_y] = p3
		
		var s1_x, s1_y, s2_x, s2_y
		var s,t

		s1_x = p1_x - p0_x
		s1_y = p1_y - p0_y
		s2_x = p3_x - p2_x
		s2_y = p3_y - p2_y
		
		s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y)
		t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y)

		if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
		{
			return true
		}
		return false
	}
}