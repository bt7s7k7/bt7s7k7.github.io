B.module.require("canvas","stuff/canvas.js")
B.module.init("paint",1,[["canvas",1.001]],()=>{
	window.brushes = {
		normal: {
			name: "Normal",
			desc: "Draws a line between positions with smooth edges.",
			paint: function (lastPos,pos,paint) {
				var ctx = paint.ctx
				var offset = [1,1].mul(-paint.style.width * 1.5)
				
				var pos = pos.add(offset)
				var lastPos = lastPos.add(offset)
				
				ctx.setColor(paint.style.color)
				ctx.ellipse(lastPos,[1,1].mul(paint.style.width))
				ctx.ellipse(pos,[1,1].mul(paint.style.width))
				ctx.line(lastPos,pos,paint.style.width * 2)
			},
			pictogram: new Pictogram([
				0,0,0,0,0,0,0,
				0,1,1,0,0,0,0,
				0,1,1,1,0,0,0,
				0,0,1,1,1,0,0,
				0,0,0,1,1,0,0,
				0,0,0,0,0,1,0,
				0,0,0,0,0,0,0
			],[7,7])
		},
		eraser: {
			name: "Eraser",
			desc: "Clears a rect on pointer position.",
			paint: function (lastPos,pos,paint) {
				paint.ctx.clearRect(pos.add([2,2].mul(paint.style.width).mul(-1)),[2,2].mul(paint.style.width))
			},
			pictogram: new Pictogram([
				0,0,0,0,0,0,0,
				0,1,1,1,1,1,0,
				0,1,1,1,1,1,0,
				0,1,1,1,1,1,0,
				0,1,0,0,0,1,0,
				0,1,0,0,0,1,0,
				0,1,1,1,1,1,0,
				0,0,0,0,0,0,0,
			],[7,8])
		}
	}
	window.Painter = function(ctx) {
		this.ctx = ctx
		this.style = {
			color: colors.black,
			width: 10,
			brush: brushes.normal
		}
		this.lastPos = [-1,-1]
		this.down = false
		
		this.enabled = true
		
		this.ctx.canvas.canvas.addEventListener("mousedown",(event)=>{
			event.preventDefault()
			this.down = true
			this.lastPos = ctx.toWorld(vector.fromObject(event,"client"))
			if (this.enabled) {this.style.brush.paint(this.lastPos,this.lastPos,this)}
		})
		
		this.ctx.canvas.canvas.addEventListener("mousemove",(event)=>{
			event.preventDefault()
			if (this.down) {
				var pos = ctx.toWorld(vector.fromObject(event,"client"))
				if (this.enabled) {this.style.brush.paint(this.lastPos,pos,this)}
				this.lastPos = pos
			}
		})
		
		window.addEventListener("mouseup",(event)=>{
			this.down = false
		})
		
		this.clear = function () {
			this.ctx.clear()
		}
	}
})