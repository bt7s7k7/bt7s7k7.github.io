/*
	DEPENDENCES
	
	- prototypes.js
*/
B.module.require("prototypes","stuff/prototypes.js")
B.module.init("canvas",1.001,["prototypes"],()=>{
	window.CanvasUtil = function(canvas) {
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
			pos1 = pos1.add(this.globalOffset)
			pos2 = pos2.add(this.globalOffset)
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
			if (typeof str == "string") {
				var img = new Image()
				img.src = str
				
				img.onload = ()=>{
					this.canvas.drawImage(img,pos[0],pos[1],size[0],size[1])
				}
			} else {
				this.canvas.drawImage(str,pos[0],pos[1],size[0],size[1])
			}
			return this
		}
		
		this.toDataUrl = function() {
			return this.canvas.canvas.toDataURL()
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
			var realSize = [
				parseInt(this.canvas.canvas.clientWidth),
				parseInt(this.canvas.canvas.clientHeight)
			]
			var ourSize = this.getSize()
			var scale = realSize.antiscale(ourSize)
			var ret = pos.scale(scale)
			return ret 
		}

		this.shape = function(poss,fill = true) {
			this.canvas.beginPath()
			this.canvas.moveTo(poss[0][0] + this.globalOffset[0],poss[0][1] + this.globalOffset[1])
			poss.forEach((v)=>{
				this.canvas.lineTo(v[0] + this.globalOffset[0],v[1] + this.globalOffset[1])
			})
			if (fill) {
				this.canvas.fill()
			} else {
				this.canvas.stroke()
			}
			
			return this
		}
		this.text = function (pos,height,txt,center = false,font = "Arial",out = {}) {
			var pos = pos.add(this.globalOffset)
			if (center == 1) {
				pos = pos.add([0,height / 4])
			}
			canvas.font = height + "px " + font
			canvas.textAlign = ["start","center","end"][center + 0]
			canvas.fillText(txt,...pos)
			out.width = canvas.measureText(txt).width
			return ctx
		}
	}

	CanvasUtil.fromElement = function(canvas) {
		return new CanvasUtil(canvas.getContext("2d"))
	}

	window.Pictogram = function (pixels,size) {
		this.pixels = pixels
		this.size = size
		
		var canvas = document.createElement("canvas")
		canvas.height = this.size[1]
		canvas.width = this.size[0]
		var ctx = canvas.getContext("2d")
		this.pixels.forEach((v,i)=>{
			if (v) {
				ctx.fillRect((i % this.size[0]),Math.floor(i / this.size[0]),1,1)
			}
		})
		this.img = new Image()
		this.img.src = canvas.toDataURL()
	}
})