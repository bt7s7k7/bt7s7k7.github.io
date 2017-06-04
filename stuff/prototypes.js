if (B.pageLoaded) {
	console.log(10)
}
B.module.init("prototypes",1.002,[],()=>{})

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

colors = {
	red : [255,0,0],
	darkRed : [127,0,0],
	blue : [0,0,255],
	darkBlue : [0,0,127],
	green : [0,255,0],
	darkGreen : [0,127,0],
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
	grey: [127,127,127],
	darkGrey: [63,63,63],
	voidGrey: [31,31,31],
	lightGrey: [191,191,191],
	orange: [255,127,0],
	softGreen: [0, 50, 50],
	notepad: [11,22,29]
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
	}
}

shapes = {
	rect: function (pos,size) {
		return {
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
			}
		}
	},
	circle: function (pos,radius) {
		return {
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
			}
		}
	}

}
