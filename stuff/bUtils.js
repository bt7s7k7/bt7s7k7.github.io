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

window.onload = function(){
	try {
		setTimeout(setup,1)
	} catch (err) {}
	B.reload()
}

window.onunload = function () {
	var error = false
	try {
		if (exit) {
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
	if (onKey) {
		onKey(event)
	}
}