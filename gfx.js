// MODULE: 	CEDANNdriver/gfx.js
// DESC: 	Basic HTML5 canvas/graphics wrapper.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-10-30

function gfx_write(text, posX, posY, fontSize, fontColour)
{
	var self = this;
	
	self.context.textAlign = "left";
	self.context.textBaseline = "top";
	self.context.fillStyle = fontColour;
	self.context.font = fontSize + "px Arial";
	self.context.fillText(text, posX, posY);
}

function gfx_copyCanvas(canvas, destX, destY)
{
	var self = this;
	
	self.context.drawImage(canvas, destX, destY);
}

function gfx_drawCircle(posX, posY, radius, fillColour, strokeWidth, strokeColour)
{
	var self = this;
	
	strokeWidth = strokeWidth || 0;
	strokeColour = strokeColour || "#000000";
	
	self.context.beginPath();
	self.context.arc(posX, posY, radius, 0, 2 * Math.PI, false);
	self.context.fillStyle = fillColour;
	self.context.fill();
	
	if(strokeWidth > 0)
	{
		self.context.lineWidth = strokeWidth;
		self.context.strokeStyle = strokeColour;
		self.context.stroke();
	}
}

function gfx_drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, colour)
{
	var self = this;
	
    self.context.fillStyle = colour;
    self.context.beginPath();
    self.context.moveTo(x1, y1);
    self.context.lineTo(x2, y2);
    self.context.lineTo(x3, y3);
    self.context.lineTo(x4, y4);
    self.context.closePath();
    self.context.fill();
}

function gfx_drawRectangle(x, y, w, h, colour)
{
	var self = this;
	
	self.context.fillStyle = colour;
	self.context.fillRect(x, y, w, h);
}

function gfx_fillBackground(colour)
{
	var self = this;
	
	self.context.fillStyle = colour;
	self.context.fillRect(0, 0, self.width, self.height);
}

function gfx_drawLine(x1, y1, x2, y2, width, colour)
{
	var self = this;
	
	self.context.beginPath();
	self.context.lineWidth = width;
	self.context.strokeStyle = colour;
	self.context.moveTo(x1,y1);
	self.context.lineTo(x2,y2);
	self.context.stroke();
}

function gfx_clear()
{
	var self = this;
	
	self.context.clearRect(0, 0, self.width, self.height);
}

function gfx_setCanvas(id, width, height)
{
	var self = this;
	
	self.canvas = dom.get(id);
	
	if(self.canvas == null)
	{
		console.error("[GFX] Could not provide canvas with id: " + id);
		return;
	}
	
	self.width = width;
	self.height = height;
	self.canvas.width = width;
	self.canvas.height = height;
	self.context = self.canvas.getContext('2d');
	
	self.ready = true;
}

function gfx_instantiate(canvasId, width, height)
{
	var spawn = {};
	
	spawn.ready = false;
	
	spawn.width = 0;
	spawn.height = 0;
	
	spawn.canvas = null;
	spawn.context = null;
	
	spawn.setCanvas = gfx_setCanvas;
	spawn.clear = gfx_clear;
	spawn.fillBackground = gfx_fillBackground;
	spawn.drawPolygon = gfx_drawPolygon;
	spawn.drawCircle = gfx_drawCircle;
	spawn.drawRectangle = gfx_drawRectangle;
	spawn.drawLine = gfx_drawLine;
	spawn.copyCanvas = gfx_copyCanvas;
	spawn.write = gfx_write;
	
	
	// INIT
	
	spawn.setCanvas(canvasId, width, height);
	
	return spawn;
}