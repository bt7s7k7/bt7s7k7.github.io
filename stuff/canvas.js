B.module.require("prototypes","stuff/prototypes.js")
B.module.init("canvas",1.003,["prototypes"],()=>{
	var window = {}
	// @class CanvasUtil
	// @desc Canvas API Wrapper for easy and simple usage.
	// @function CanvasUtil:CanvasUtil
	// @param canvas CanvasRenderingContext2D The canvas to use with the utility
	// @constructor
	window.CanvasUtil = function CanvasUtil(canvas) {
		// @prop #:canvas
		// @def canvas provided in the constructor
		// @type CanvasRenderingContext2D
		// @desc The canvas to use with the utility
		this.canvas = canvas;
		// @prop #:globalOffset
		// @def [0,0]
		// @type Vector2
		// @desc The offset to move all operations. Can be used to simulate camera or move the origin.
		this.globalOffset = [0,0]
		// @method #:setColor
		// @param color Vector3
		// @return CanvasUtil this
		// @desc Use to change color of operations.
		this.setColor = function (color) {
			if (color instanceof CanvasGradient) {
				this.canvas.fillStyle = color
				this.canvas.strokeStyle = color
				return this
			}
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
		// @method #:box
		// @param pos Vector2 The position of the box
		// @param size Vector2 The size of the box
		// @return CanvasUtil this
		// @desc Draw a box with the desired size and position.
		this.box = function(pos,size) {
			pos = pos.add(this.globalOffset)
			this.canvas.fillRect(pos[0],pos[1],size[0],size[1]);
			return this
		}
		// @method #:rect
		// @param pos Vector2 The position of the rect
		// @param size Vector2 The size of the rect
		// @return CanvasUtil this
		// @desc Draw a hollow box with the desired size and position.
		this.rect = function(pos,size,width = 1) {
			pos = pos.add(this.globalOffset)
			this.canvas.lineWidth = width
			this.canvas.beginPath()
			this.canvas.rect(pos[0],pos[1],size[0],size[1])
			this.canvas.stroke()
			return this
		}
		// @method #:line
		// @param pos1 Vector2 Start of the line
		// @param pos2 Vector2 End of the line
		// @param width Float Width of the line
		// @return CanvasUtil this
		// @desc Draws a line from start to end.
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
		// @method #:zigzagLine
		// @param pos1 Vector2 Start of the line
		// @param pos2 Vector2 End of the line
		// @param width Float Width of the line
		// @return CanvasUtil this
		// @desc Draws a zigzag line from start to end.
		this.zigzagLine = function(pos1,pos2,width = 1) {
			this.shape([
				pos1,
				[(pos1[0] + pos2[0]) / 2,pos1[1]],
				[(pos1[0] + pos2[0]) / 2,pos2[1]],
				pos2
			],false,width)
		}
		// @method #:ellipse
		// @param pos Vector2 The position of the ellipse
		// @param size Vector2 The size of the ellipse
		// @param range Vector2 Two 2D radial spherical coordinates.
		// @return CanvasUtil this
		// @desc Draw a ellipse with the desired size and position. The spherical coordinates mark from to where to draw the arc of the of the ellipse.
		this.ellipse = function(pos,size,rot = [0,Math.PI * 2]) {
			pos = pos.add(this.globalOffset)
			this.canvas.beginPath()
			this.canvas.ellipse(pos[0],pos[1],size[0],size[1],rot[0],0,rot[1])
			this.canvas.fill()
			return this
		}
		// @method #:strokeEllipse
		// @param pos Vector2 The position of the ellipse
		// @param size Vector2 The size of the ellipse
		// @param width float Line width
		// @param range Vector2 Two 2D radial spherical coordinates.
		// @return CanvasUtil this
		// @desc Draw an empty ellipse with the desired size and position. The spherical coordinates mark from to where to draw the arc of the of the ellipse.
		this.strokeEllipse = function(pos,size,width = 1,rot = [0,Math.PI * 2]) {
			pos = pos.add(this.globalOffset)
			this.canvas.lineWidth = width;
			this.canvas.beginPath()
			this.canvas.ellipse(pos[0],pos[1],size[0],size[1],rot[0],0,rot[1])
			this.canvas.stroke()
			return this
		}
		// @method #:clear
		// @return CanvasUtil this
		// @desc Clears the canvas.
		// @return CanvasUtil this
		this.clear = function() {
			this.canvas.clearRect(0,0,this.canvas.canvas.width,this.canvas.canvas.height)
			return this
		} 
		// @method #:fill
		// @return CanvasUtil this
		// @desc Fills the canvas.
		// @return CanvasUtil this
		this.fill = function() {
			this.canvas.fillRect(0,0,this.canvas.canvas.width,this.canvas.canvas.height)
			return this
		} 
		// @method #:load
		// @return CanvasUtil this
		// @param source string/ImageData/ImageSource The source of the image to load. &b[;string&b]; will load the url
		// @param pos Vector2 Optional offset
		// @param size Vector2 Option size (defaults to canvas size). Ignored with &b[;ImageData&b];
		// @param callback Function() Will be called after the url has been loaded.
		// @desc Load an imge from the image source provided.
		this.load = function(str,pos = [0,0],size = [this.canvas.canvas.width,this.canvas.canvas.height],callback = ()=>{}) {
			pos = pos.add(this.globalOffset)
			if (typeof str == "string") {
				var img = new Image()
				img.src = str
				
				img.onload = ()=>{
					if (size == "image") {
						size = [img.width,img.height]
					}
					if (size == "image+transform") {
						size = [img.width,img.height]
						this.setSize(size)
					}
					this.canvas.drawImage(img,pos[0],pos[1],size[0],size[1])
					callback()
				}
			} else if (str instanceof ImageData) {
				this.canvas.putImageData(str,...pos)
			} else 	{
				this.canvas.drawImage(str,pos[0],pos[1],size[0],size[1])
			}
			return this
		}
		
		// @method #:toDataUrl
		// @return string DataUrl of the image on the canvas
		// @desc Returns DataUrl of the image on the canvas.
		this.toDataUrl = function() {
			return this.canvas.canvas.toDataURL()
		}
		
		this.toDataURL = this.toDataUrl
		// @method #:getImageData
		// @param pos Vector2 The pos of the copied rect.
		// @param size Vector2 The size of the copied rect.
		// @return ImageData The copied image
		// @desc Copies the provided rect from the canvas image. If left empty the whole canvas will be copied.
		this.getImageData = function(pos = [0,0],size = this.getSize()) {
			return this.canvas.getImageData(...pos,...size)
		}
		
		this.clearRect = function(pos,size) {
			pos = pos.add(this.globalOffset)
			this.canvas.clearRect(pos[0],pos[1],size[0],size[1])
			return this
		}
		// @method #:getSize
		// @return Vector2 Canvas size
		this.getSize = function() {
			return [this.canvas.canvas.width,this.canvas.canvas.height]
		}
		// @method #:setSize
		// @param size Vector2 New size
		// @return CanvasUtil this

		this.setSize = function(size) {
			this.canvas.canvas.width = size[0]
			this.canvas.canvas.height = size[1]
			return this
		}
		//--------------------------------------------------------------------------------------------------------------------------------------------
		//                                                        !!DEPRECATED!!
		//--------------------------------------------------------------------------------------------------------------------------------------------
		{
			this.sprites = []
			this.drawSpriteColl = false

			this.addSprite = function (pos, size, color, coll = true) {
				var sprite = { pos: pos, size: size, color: color, coll: coll }
				var id = this.sprites.length
				var sprites = this.sprites
				sprite.remove = function () {
					sprites.splice(sprites.indexOf(sprite), 1)
				}
				sprite.move = function (offset) {
					pos = pos.add(offset)
				}
				sprite.collides = function (other, second = false) {
					if (!other.coll) { return }
					var coll = false
					var edges = [
						sprite.wpos(),
						sprite.wpos().add([sprite.size[0], 0]),
						sprite.wpos().add([0, sprite.size[1]]),
						sprite.wpos().add([sprite.size[0], sprite.size[1]])
					]
					edges.forEach((edge) => {
						var xs = edge[0].between(other.wpos()[0], other.wpos()[0] + other.size[0])
						var ys = edge[1].between(other.wpos()[1], other.wpos()[1] + other.size[1])
						coll = coll || (xs && ys)
					})
					if (!second) {
						coll = coll || other.collides(sprite, true)
					}
					return coll
				}
				sprite.intersects = function (other) {
					var coll = false
					var edges = [
						sprite.wpos(),
						sprite.wpos().add([sprite.size[0], 0]),
						sprite.wpos().add([0, sprite.size[1]]),
						sprite.wpos().add([sprite.size[0], sprite.size[1]])
					]
					edges.forEach((edge) => {
						var xs = edge[0].between(other.wpos()[0], other.wpos()[0] + other.size[0])
						var ys = edge[1].between(other.wpos()[1], other.wpos()[1] + other.size[1])
						coll = coll || (xs && ys)
					})
					return coll
				}

				sprite.collidesAny = function () {
					var coll = 0
					sprites.forEach((v) => {
						if (v != sprite) {
							if (sprite.collides(v)) {
								coll++
							}
						}
					})
					return coll
				}
				sprite.parent = null
				sprite.wpos = function () {
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
				this.sprites.forEach((v) => {
					if (v.color) {
						this.setColor(v.color)
						this.box(v.wpos().add(this.globalOffset), v.size)
					}
				})
				if (this.drawSpriteColl) {
					this.sprites.forEach((v) => {
						this.setColor(colors.green)
						this.rect(v.wpos().add(this.globalOffset), v.size)
					})
				}
			}

			this.castPoint = function (edge) {
				ret = null
				this.sprites.forEach((other) => {
					if (!other.coll) { return }

					var xs = edge[0].between(other.wpos()[0], other.wpos()[0] + other.size[0])
					var ys = edge[1].between(other.wpos()[1], other.wpos()[1] + other.size[1])

					if (xs && ys) {
						ret = other
					}
				})
				return ret
			}
		}
		//-----------------------------------------------------------END OF DEPRECATED----------------------------------------------------------------
		// @method #:toWorld
		// @param pos Vector2 Outside point
		// @return Vector2 World point
		// @desc Computes the world point using the HTML element size and global offset.
		this.toWorld = function(pos) {
			var realSize = [
				parseInt(this.canvas.canvas.clientWidth),
				parseInt(this.canvas.canvas.clientHeight)
			]
			return pos.map((v,i)=>{
				return v.map(0,realSize[i],0,this.getSize()[i])
			}).add(this.globalOffset.mul(-1))
		}
		// @method #:shape
		// @param pos Vector2[] Positions of the shape points.
		// @param fill boolean
		// @param width float Width of the line
		// @desc Draws a shape using the points.
		this.shape = function(poss,fill = true,width = 1) {
			this.canvas.beginPath()
			this.canvas.lineWidth = width;
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
		// @method #:text
		// @param pos Vector2
		// @param height float Height of the text. You can get the final width using the measureText method
		// @param text string 
		// @param center boolean/int Alingment of the text. 0=start,1/true=center,2=end
		// @param font String Defaults to arial.
		// @return CanvasUtil this
		// @desc Prints text on the canvas.
		this.text = function (pos,height,txt = "",center = false,font = "Arial") {
			var pos = pos.add(this.globalOffset)
			if (center == 1) {
				pos = pos.add([0,height / 4])
			}
			canvas.font = height + "px " + font
			canvas.textAlign = ["start","center","end"][center + 0]
			txt.toString().split("\n").forEach((v,i)=>{
				canvas.fillText(v,...(pos.add([0,i * (height * 1.1)])))
			})
			
			return this
		}
		this.measureText = function (height,txt,font = "Arial") {
			canvas.font = height + "px " + font
			var ret = canvas.measureText(txt)
			var height = height + (height * 1.1) * (txt.split("\n").length - 1)
			return { width: ret.width, height }
		}
	}

	window.CanvasUtil.fromElement = function(canvas) {
		return new CanvasUtil(canvas.getContext("2d"))
	}
	
	window.CanvasUtil.virtual = function (size) {
		return document.createElement("canvas").toCtx().setSize(size)
	}

	window.Pictogram = function Pictogram(pixels,size) {
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
	
	window.LayeredCanvas = function(ctx) {
		this.ctx = ctx
		this.layers = []
		this.createLayer = function (size = ctx.getSize()) {
			var elem = document.createElement("canvas")
			elem.setAttribute("width",size[0])
			elem.setAttribute("height",size[1])
			var ctx = new CanvasUtil(elem.getContext("2d"))
			this.addLayer(ctx)
			return ctx
		}
		
		this.addLayer = function (ctx) {
			this.layers.push({
				offset:[0,0],
				ctx:ctx
			})
		}
		
		this.removeLayer = function (ctx) {
			this.layers.splice(this.layers.indexOf(this.layers.filter((v)=>{
				return v.ctx == ctx
			})[0]),1)
		}
		
		this.flush = function () {
			this.layers.forEach((v)=>{
				this.ctx.load(v.ctx.canvas,v.offset,v.ctx.getSize())
			})
		}
	}
	
	HTMLCanvasElement.prototype.toCtx = function() {
		return new window.CanvasUtil(this.getContext("2d"))
	}
	
	CanvasRenderingContext2D.prototype.toCtx = function() {
		return new window.CanvasUtil(this)
	}
	
	return window
})