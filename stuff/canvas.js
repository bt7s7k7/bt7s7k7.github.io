function CanvasUtil(canvas) {
	this.canvas = canvas;
	
	this.setColor = function(color) {
		if (color[0] > 255) {
			color[0] = 255
		} else if (color[0] < 0) {
			color[0] = 0
		}
		
		if (color[1] > 255) {
			color[1] = 255
		} else if (color[0] < 0) {
			color[1] = 0
		}
		
		if (color[2] > 255) {
			color[2] = 255
		} else if (color[0] < 0) {
			color[2] = 0
		}
		
		color[0] = Math.floor(color[0])
		color[1] = Math.floor(color[1])
		color[2] = Math.floor(color[2])
		
		this.canvas.fillStyle = "rgb("+color[0]+","+color[1]+","+color[2]+")";
		this.canvas.strokeStyle = "rgb("+color[0]+","+color[1]+","+color[2]+")";
		return this
	}
	
	this.box = function(pos,size) {
		this.canvas.fillRect(pos[0],pos[1],size[0],size[1]);
		return this
	}
	
	this.line = function(pos1,pos2,width = 1) {
		this.canvas.lineWidth = width;
		this.canvas.beginPath()
		this.canvas.moveTo(pos1[0],pos1[1]);
		this.canvas.lineTo(pos2[0],pos2[1]);
		this.canvas.stroke()
		return this
	}
	
	this.ellipse = function(pos,size,rot = 0) {
		this.canvas.beginPath()
		this.canvas.ellipse(pos[0],pos[1],size[0],size[1],rot,0,Math.PI * 2)
		this.canvas.fill()
		return this
	}
	
	this.clear = function() {
		this.canvas.clearRect(0,0,this.canvas.canvas.width,this.canvas.canvas.height)
		return this
	} 
	this.fill = function() {
		this.canvas.fillRect(0,0,this.canvas.canvas.width,this.canvas.canvas.height)
		return this
	} 
	
	this.load = function(str,pos = [0,0],size = [this.canvas.canvas.width,this.canvas.canvas.height]) {
		var img = new Image()
		img.src = str
		img.onload = ()=>{
			this.canvas.drawImage(img,pos[0],pos[1],size[0],size[1])
		}
		return this
	}
	
	this.clearRect = function(pos,size) {
		this.canvas.clearRect(pos[0],pos[1],size[0],size[1])
		return this
	}
	
	this.getSize = function() {
		return [this.canvas.canvas.width,this.canvas.canvas.height]
	}
	
	
	this.setSize = function(size) {
		this.canvas.canvas.width = size[0]
		this.canvas.canvas.height = size[1]
		return this
	}
}

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

Number.prototype.notNaN = function() {
	if (isNaN(this)) {
		return 0
	} else {
		return this
	}
}

colors = {
	red : [255,0,0],
	blue : [0,0,255],
	green : [0,255,0],
	yellow : [255,255,0],
	aqua : [0,255,255],
	pink : [255,0,255],
	white : [255,255,255],
	black : [0,0,0],
	fromHex : function(hex) {
		var hexs = hex.substr(1).split("")
		return [parseInt(hexs[0] + hexs[1],16),parseInt(hexs[2] + hexs[3],16),parseInt(hexs[4] + hexs[5],16)]
	},
	gray: [127,127,127],
	orange: [255,127,0]
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
	}
}

CanvasUtil.fromElement = function(canvas) {
	return new CanvasUtil(canvas.getContext("2d"))
}

function Matrix(iVec,jVec) {
	this.j = jVec
	this.i = iVec
	
	this.transform = function(vec) {
		return this.i.mul(vec[0]).add(this.j.mul(vec[1]))
	}
}