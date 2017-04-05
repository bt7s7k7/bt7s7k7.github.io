function CanvasUtil(canvas) {
	this.canvas = canvas;
	this.globalOffset = [0,0]
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
		pos = pos.add(this.globalOffset)
		this.canvas.fillRect(pos[0],pos[1],size[0],size[1]);
		return this
	}
	
	this.rect = function(pos,size) {
		pos = pos.add(this.globalOffset)
		this.canvas.beginPath()
		this.canvas.rect(pos[0],pos[1],size[0],size[1])
		this.canvas.stroke()
		return this
	}
	
	this.line = function(pos1,pos2,width = 1) {
		pos1 = pos.add(this.globalOffset)
		pos2 = pos.add(this.globalOffset)
		this.canvas.lineWidth = width;
		this.canvas.beginPath()
		this.canvas.moveTo(pos1[0],pos1[1]);
		this.canvas.lineTo(pos2[0],pos2[1]);
		this.canvas.stroke()
		return this
	}
	
	this.ellipse = function(pos,size,rot = 0) {
		pos = pos.add(this.globalOffset)
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
		pos = pos.add(this.globalOffset)
		var img = new Image()
		img.src = str
		img.onload = ()=>{
			this.canvas.drawImage(img,pos[0],pos[1],size[0],size[1])
		}
		return this
	}
	
	this.clearRect = function(pos,size) {
		pos = pos.add(this.globalOffset)
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
	
	this.sprites = []
	this.drawSpriteColl = false
	
	this.addSprite = function (pos,size,color,coll = true) {
		var sprite = {pos:pos,size:size,color:color,coll:coll}
		var id = this.sprites.length
		var sprites = this.sprites
		sprite.remove = function () {
			sprites.splice(sprites.indexOf(sprite),1)
		}
		sprite.move = function(offset) {
			pos = pos.add(offset)
		}
		sprite.collides = function (other,second = false) {
			if (!other.coll) {return}
			var coll = false
			var edges = [
				sprite.wpos(),
				sprite.wpos().add([sprite.size[0],0]),
				sprite.wpos().add([0,sprite.size[1]]),
				sprite.wpos().add([sprite.size[0],sprite.size[1]])
			]
			edges.forEach((edge)=>{
				var xs = edge[0].between(other.wpos()[0],other.wpos()[0] + other.size[0])
				var ys = edge[1].between(other.wpos()[1],other.wpos()[1] + other.size[1])
				coll = coll || (xs && ys)
			})
			if (!second) {
				coll = coll || other.collides(sprite,true)
			}
			return coll
		}
		sprite.intersects = function (other) {
			var coll = false
			var edges = [
				sprite.wpos(),
				sprite.wpos().add([sprite.size[0],0]),
				sprite.wpos().add([0,sprite.size[1]]),
				sprite.wpos().add([sprite.size[0],sprite.size[1]])
			]
			edges.forEach((edge)=>{
				var xs = edge[0].between(other.wpos()[0],other.wpos()[0] + other.size[0])
				var ys = edge[1].between(other.wpos()[1],other.wpos()[1] + other.size[1])
				coll = coll || (xs && ys)
			})
			return coll
		}
		
		sprite.collidesAny = function () {
			var coll = 0
			sprites.forEach((v)=>{
				if (v != sprite) {
					if (sprite.collides(v)) {
						coll++
					}
				}
			})
			return coll
		}
		sprite.parent = null
		sprite.wpos = function() {
			if (sprite.parent) {
				return sprite.pos.add(sprite.parent.wpos())
			} else {
				return sprite.pos
			}
		}
		this.sprites[id] = sprite
		return sprite
	}
	
	this.drawSprites = function (offset) {
		this.sprites.forEach((v)=>{
			if (v.color) {
				this.setColor(v.color)
				this.box(v.wpos().add(this.globalOffset),v.size)
			}
		})
		if (this.drawSpriteColl) {
			this.sprites.forEach((v)=>{
				this.setColor(colors.green)
				this.rect(v.wpos().add(this.globalOffset),v.size)
			})
		}
	}
	
	this.castPoint = function(edge) {
		ret = null
		this.sprites.forEach((other)=>{
			if (!other.coll) {return}
			
			var xs = edge[0].between(other.wpos()[0],other.wpos()[0] + other.size[0])
			var ys = edge[1].between(other.wpos()[1],other.wpos()[1] + other.size[1])

			if (xs && ys) {
				ret =  other
			}
		})
		return ret
	}
	this.toWorld = function(pos) {
		pos = pos.add(ctx.globalOffset.mul(-2))
		return pos
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

Number.prototype.between = function(first,second) {
	return this <= Math.max(first,second) && this >= Math.min(first,second)
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
	grey: [127,127,127],
	darkGrey: [63,63,63],
	lightGrey: [191,191,191],
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