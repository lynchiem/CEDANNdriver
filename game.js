// MODULE: 	CEDANNdriver/game.js
// DESC: 	A basic psuedo-3D driving game, for neural network testing.
// DESC: 	Driving game heavily inspired by Code inComplete's tutorial.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-10-30

function game_addRoadSegment(curve)
{
	var self = this;
	
	var i = self.roadSegments.length;
	self.roadSegments.push({
		index: i,
		p1: { world: { z: i * self.roadSegmentLength }, camera: {}, screen: {} },
		p2: { world: { z: (i + 1) * self.roadSegmentLength }, camera: {}, screen: {} },
		curve: curve,
		colour: (Math.floor(i / self.rumbleLength) % 2)? self.ROAD_COLOURS.DARK : self.ROAD_COLOURS.LIGHT
	});
}

function game_addRoadSection(enter, hold, leave, curve)
{
	var self = this;
	
	for(var i = 0; i < enter; i++)
		self.addRoadSegment(num.easeIn(0, curve, i / enter));
	
	for(var i = 0; i < hold; i++)
		self.addRoadSegment(curve);
	
	for(var i = 0; i < leave; i++)
		self.addRoadSegment(num.ease(curve, 0, i / leave));
}

function game_addRoadStraight(length)
{
	var self = this;
	
	length = length || self.ROAD_PRESETS.LENGTH.MEDIUM;
	
	self.addRoadSection(length, length, length, 0);
}

function game_addRoadCurve(length, curve)
{
	var self = this;
	
	length = length || self.ROAD_PRESETS.LENGTH.MEDIUM;
	curve = curve || self.ROAD_PRESETS.CURVE.MEDIUM;
	
	self.addRoadSection(length, length, length, curve);
}

function game_addRoadSCurve()
{
	var self = this;
	
	var lmed = self.ROAD_PRESETS.LENGTH.MEDIUM;
	var cezy = self.ROAD_PRESETS.CURVE.EASY;
	var cmed = self.ROAD_PRESETS.CURVE.MEDIUM;
	
	self.addRoadSection(lmed, lmed, lmed, -cezy);
	self.addRoadSection(lmed, lmed, lmed, cmed);
	self.addRoadSection(lmed, lmed, lmed, cezy);
	self.addRoadSection(lmed, lmed, lmed, -cezy);
	self.addRoadSection(lmed, lmed, lmed, -cmed);
}

function game_buildCourse()
{
	var self = this;
	
	self.roadSegments = [];
	
	self.addRoadStraight(self.ROAD_PRESETS.LENGTH.SHORT / 4);
	self.addRoadSCurve();
	self.addRoadStraight(self.ROAD_PRESETS.LENGTH.LONG);
	self.addRoadCurve(self.ROAD_PRESETS.LENGTH.MEDIUM, self.ROAD_PRESETS.CURVE.MEDIUM);
	self.addRoadCurve(self.ROAD_PRESETS.LENGTH.LONG, self.ROAD_PRESETS.CURVE.MEDIUM);
	self.addRoadStraight();
	self.addRoadSCurve();
	self.addRoadCurve(self.ROAD_PRESETS.LENGTH.LONG, -self.ROAD_PRESETS.CURVE.MEDIUM);
	self.addRoadCurve(self.ROAD_PRESETS.LENGTH.LONG, self.ROAD_PRESETS.CURVE.MEDIUM);
	self.addRoadStraight();
	self.addRoadSCurve();
	self.addRoadCurve(self.ROAD_PRESETS.LENGTH.LONG, -self.ROAD_PRESETS.CURVE.EASY);

	self.roadSegments[self.getRoadSegment(self.carPosZ).index + 2].colour = self.ROAD_COLOURS.START;
	self.roadSegments[self.getRoadSegment(self.carPosZ).index + 3].colour = self.ROAD_COLOURS.START;
	
	for(var i = 0; i < self.rumbleLength; i++)
		self.roadSegments[self.roadSegments.length - 1 - i].colour = self.ROAD_COLOURS.FINISH;
	
	self.roadLength = self.roadSegments.length * self.roadSegmentLength;
}

function game_getRoadSegment(z)
{
	var self = this;
	
	return self.roadSegments[Math.floor(z / self.roadSegmentLength) % self.roadSegments.length];
}

function game_updateCarPosition(delta)
{
	var self = this;

	if(self.roadLength == null)
		return;
	
	self.carPos += delta;

	// while (self.carPos >= self.roadLength)
	  // self.carPos -= self.roadLength;
	
	// while (self.carPos < 0)
	  // self.carPos += self.roadLength;
	
}

function game_update(dt)
{
	var self = this;
	
	if(self.complete)
		return;

	var carSegment = self.getRoadSegment(self.carPos + self.carPosZ);
    var speedPercent  = self.carSpeed / self.carMaxSpeed;
	var dx = dt * 2 * (self.carSpeed / self.carMaxSpeed);
	
	var previousCarPos = self.carPos;
	
	self.updateCarPosition(dt * self.carSpeed);
	
	if(self.carPos >= self.roadLength)
	{
		self.complete = true;
		return;
	}
	
	self.carPosX -= (self.keyLeft)? dx : 0;
	self.carPosX += (self.keyRight)? dx : 0;
	
	self.carPosX  -= dx * speedPercent * carSegment.curve * self.carCentrifugal;
	
	var dv = self.carDeceleration; // default to natural deceleration
	
	dv = (self.keyAccelerate)? self.carAcceleration : dv;
	dv = (self.keyBreak)? self.carBreaking : dv;
	
	self.carSpeed += dv * dt;
	
	if (((self.carPosX < -1) || (self.carPosX > 1)) && (self.carSpeed > self.offRoadSpeedLimit))
		self.carSpeed += self.offRoadDeceleration * dt;
	
	self.carPosX = num.limit(self.carPosX, -2, 2);
	self.carSpeed = num.limit(self.carSpeed, 0, self.carMaxSpeed);
	
}

function game_projectRoadSegment(pos, cameraX, cameraZ)
{
	var self = this;
	
	var width = self.gfx.width;
	var height = self.gfx.height;
	
	pos.camera.x     = (pos.world.x || 0) - cameraX;
	pos.camera.y     = (pos.world.y || 0) - self.cameraHeight;
	pos.camera.z     = (pos.world.z || 0) - cameraZ;
	pos.screen.scale = self.cameraDepth / pos.camera.z;
	pos.screen.x     = Math.round((width / 2) + (pos.screen.scale * pos.camera.x * (width / 2)));
	pos.screen.y     = Math.round((height / 2) - (pos.screen.scale * pos.camera.y * (height / 2)));
	pos.screen.w     = Math.round((pos.screen.scale * self.roadWidth * (width / 2)));
}

function game_render()
{
	var self = this;

	self.gfx.clear();
	self.gfx.fillBackground(self.SKY_COLOUR);
	self.renderRoadSegments();
}

function game_renderRoadSegments()
{
	var self = this;
	
	var baseSegment = self.getRoadSegment(self.carPos);
	var basePercent = num.percentRemaining(self.carPos, self.roadSegmentLength);
	var maxY = self.gfx.height;

	var x  = 0;
	var dx = -(baseSegment.curve * basePercent);

	//Render.background(ctx, background, width, height, BACKGROUND.SKY,   skyOffset);
	//Render.background(ctx, background, width, height, BACKGROUND.HILLS, hillOffset);
	//Render.background(ctx, background, width, height, BACKGROUND.TREES, treeOffset);

	for(var i = 0; i < self.viewDistance; i++)
	{
		var segment = self.roadSegments[(baseSegment.index + i) % self.roadSegments.length];
		
		segment.looped = segment.index < baseSegment.index;
		//segment.fog    = Util.exponentialFog(n/drawDistance, fogDensity);

		var cameraZ = self.carPos - ((segment.looped)? self.roadLength : 0);
		
		self.projectRoadSegment(segment.p1, (self.carPosX * self.roadWidth) - x, cameraZ);
		self.projectRoadSegment(segment.p2, (self.carPosX * self.roadWidth) - x - dx, cameraZ);
		
		x  = x + dx;
		dx = dx + segment.curve;
		
		if ((segment.p1.camera.z <= self.cameraDepth) || (segment.p2.screen.y >= maxY))
			continue;
		
		self.renderRoadSegment(segment);

		maxY = segment.p2.screen.y;
	}
}

function game_renderRoadSegment(segment)
{
	var self = this;
	
	var r1 = segment.p1.screen.w / Math.max(6,  2 * self.roadLanes);
    var r2 = segment.p2.screen.w / Math.max(6,  2 * self.roadLanes);
    var l1 = segment.p1.screen.w / Math.max(32, 8 * self.roadLanes);
    var l2 = segment.p2.screen.w / Math.max(32, 8 * self.roadLanes);
    
	var lanew1, lanew2, lanex1, lanex2, lane;
    
    self.gfx.context.fillStyle = segment.colour.grass;
    self.gfx.context.fillRect(0, segment.p2.screen.y, self.gfx.width, segment.p1.screen.y - segment.p2.screen.y);
    
    self.gfx.drawPolygon(
		segment.p1.screen.x - segment.p1.screen.w - r1, 
		segment.p1.screen.y, 
		segment.p1.screen.x - segment.p1.screen.w, 
		segment.p1.screen.y, 
		segment.p2.screen.x - segment.p2.screen.w, 
		segment.p2.screen.y, 
		segment.p2.screen.x - segment.p2.screen.w - r2, 
		segment.p2.screen.y, 
		segment.colour.rumble
	);
	
    self.gfx.drawPolygon(
		segment.p1.screen.x + segment.p1.screen.w + r1, 
		segment.p1.screen.y, 
		segment.p1.screen.x + segment.p1.screen.w, 
		segment.p1.screen.y, 
		segment.p2.screen.x + segment.p2.screen.w, 
		segment.p2.screen.y, 
		segment.p2.screen.x + segment.p2.screen.w + r2, 
		segment.p2.screen.y, 
		segment.colour.rumble
	);
    
	self.gfx.drawPolygon(
		segment.p1.screen.x - segment.p1.screen.w,
		segment.p1.screen.y, 
		segment.p1.screen.x + segment.p1.screen.w, 
		segment.p1.screen.y, 
		segment.p2.screen.x + segment.p2.screen.w, 
		segment.p2.screen.y, 
		segment.p2.screen.x - segment.p2.screen.w,
		segment.p2.screen.y,
		segment.colour.road
	);
    
    if(segment.colour.lane)
	{
		lanew1 = segment.p1.screen.w * 2 / self.roadLanes;
		lanew2 = segment.p2.screen.w * 2 / self.roadLanes;
		lanex1 = segment.p1.screen.x - segment.p1.screen.w + lanew1;
		lanex2 = segment.p2.screen.x - segment.p2.screen.w + lanew2;
		
		for(lane = 1 ; lane < self.roadLanes ; lanex1 += lanew1, lanex2 += lanew2, lane++)
			self.gfx.drawPolygon(lanex1 - l1/2, segment.p1.screen.y, lanex1 + l1/2, segment.p1.screen.y, lanex2 + l2/2, segment.p2.screen.y, lanex2 - l2/2, segment.p2.screen.y, segment.colour.lane);
    }
}

function game_frame()
{
	var self = this;
	
	if(self.roadSegments == null || self.roadSegments.length == 0)
		return;
	
	self.currentFrameStart = num.timestamp();
	
	self.deltaFrameTime  = Math.min(1, (self.currentFrameStart - self.previousFrameStart) / 1000);
	self.deltaGameTime = self.deltaGameTime + self.deltaFrameTime;
	
	while (self.deltaGameTime > self.frameStep)
	{
		self.deltaGameTime = self.deltaGameTime - self.frameStep;
		self.update(self.frameStep);
	}
	
	self.render();
	self.previousFrameStart = self.currentFrameStart;
	
	window.requestAnimationFrame(function() { self.frame(); });
}

function game_keyPressed(keyCode)
{
	var self = this;
	
	if(keyCode == self.KEY_CODES.UP || keyCode == self.KEY_CODES.W)
		self.keyAccelerate = true;
	
	if(keyCode == self.KEY_CODES.DOWN || keyCode == self.KEY_CODES.S)
		self.keyBreak = true;
	
	if(keyCode == self.KEY_CODES.LEFT || keyCode == self.KEY_CODES.A)
		self.keyLeft = true;
	
	if(keyCode == self.KEY_CODES.RIGHT || keyCode == self.KEY_CODES.D)
		self.keyRight = true;
	
}

function game_keyReleased(keyCode)
{
	var self = this;
	
	if(keyCode == self.KEY_CODES.UP || keyCode == self.KEY_CODES.W)
		self.keyAccelerate = false;
	
	if(keyCode == self.KEY_CODES.DOWN || keyCode == self.KEY_CODES.S)
		self.keyBreak = false;
	
	if(keyCode == self.KEY_CODES.LEFT || keyCode == self.KEY_CODES.A)
		self.keyLeft = false;
	
	if(keyCode == self.KEY_CODES.RIGHT || keyCode == self.KEY_CODES.D)
		self.keyRight = false;
	
}

function game_reset()
{
	var self = this;
	
	self.currentFrameStart = num.timestamp();
	self.previousFrameStart = self.currentFrameStart;
	
	self.lapStart = num.timestamp();
	
	self.deltaFrameTime = 0;
	self.deltaGameTime = 0;
	
	self.carPos = 0;
	self.carPosX = 0;
	self.carSpeed = 0;
	
	self.complete = false;
}

function game_initiate(canvasId)
{	
	var spawn = {};
	
	spawn.complete = false;
	
	spawn.keyAccelerate = false;
	spawn.keyBreak = false;
	spawn.keyLeft = false;
	spawn.keyRight = false;
	
	spawn.framesPerSecond = 60;
	spawn.frameStep = 1 / spawn.framesPerSecond;
	
	spawn.viewWidth = 400;
	spawn.viewHeight = 300;
	spawn.viewDistance = 300;

	spawn.fieldOfView = 100;
	
	spawn.gfx = gfx_instantiate(canvasId, spawn.viewWidth, spawn.viewHeight);
	
	spawn.cameraHeight = 1000;
	spawn.cameraDepth = 1 / Math.tan((spawn.fieldOfView / 2) * Math.PI / 180);
	
	spawn.roadWidth = 2000;
	spawn.roadLength = null;
	spawn.roadSegmentLength = 200;
	spawn.roadLanes = 3;
	
	spawn.rumbleLength  = 3;
	
	spawn.carPos = 0;
	spawn.carPosX = 0;
	spawn.carPosZ = spawn.cameraHeight * spawn.cameraDepth;
	spawn.carSpeed = 0;
	spawn.carMaxSpeed = spawn.roadSegmentLength / spawn.frameStep;
	spawn.carAcceleration = spawn.carMaxSpeed / 5;
	spawn.carBreaking = -spawn.carMaxSpeed;
	spawn.carDeceleration = -spawn.carMaxSpeed / 5;
	spawn.carCentrifugal = 0.3;
	
	spawn.offRoadDeceleration = -spawn.carMaxSpeed / 1.25;
	spawn.offRoadSpeedLimit = spawn.carMaxSpeed / 4; 
	
	spawn.roadSegments = [];
	
	spawn.currentFrameStart = num.timestamp();
	spawn.previousFrameStart = spawn.currentFrameStart;
	
	spawn.lapStart = num.timestamp();
	
	spawn.deltaFrameTime = 0;
	spawn.deltaGameTime = 0;
	
	spawn.reset = game_reset;
	spawn.frame = game_frame;
	spawn.update = game_update;
	
	spawn.render = game_render;
	spawn.renderRoadSegments = game_renderRoadSegments;
	spawn.renderRoadSegment = game_renderRoadSegment;
	
	spawn.projectRoadSegment = game_projectRoadSegment;
	
	spawn.buildCourse = game_buildCourse;
	spawn.addRoadSegment = game_addRoadSegment;
	spawn.addRoadSection = game_addRoadSection;
	spawn.addRoadStraight = game_addRoadStraight;
	spawn.addRoadCurve = game_addRoadCurve;
	spawn.addRoadSCurve = game_addRoadSCurve;
	spawn.getRoadSegment = game_getRoadSegment;
	spawn.updateCarPosition = game_updateCarPosition;
	
	spawn.keyPressed = game_keyPressed;
	spawn.keyReleased = game_keyReleased;
	
	dom.on(document, 'keydown', function(e) { spawn.keyPressed(e.keyCode); });
    dom.on(document, 'keyup', function(e) { spawn.keyReleased(e.keyCode); });
	
	
	// ENUMS
	
	spawn.KEY_CODES = {
		LEFT:  37,
		UP:    38,
		RIGHT: 39,
		DOWN:  40,
		A:     65,
		D:     68,
		S:     83,
		W:     87
	};
	
	spawn.SKY_COLOUR = "#3CBCFD";
	
	spawn.ROAD_COLOURS = {
		LIGHT:  { road: "#7C7C7C", grass: "#017800", rumble: "#503001", lane: "#BCBCBC" },
		DARK:   { road: "#787878", grass: "#016701", rumble: "#FD9F45", lane: null },
		START:  { road: "#BCBCBC", grass: "#017800", rumble: "#A81100", lane: null },
		FINISH: { road: "#BCBCBC", grass: "#016701", rumble: "#A81100", lane: null }
	};
	
	spawn.ROAD_PRESETS = {
		LENGTH: { NONE: 0, SHORT:  25, MEDIUM:  50, LONG:  100 },
		CURVE:  { NONE: 0, EASY:    2, MEDIUM:   4, HARD:    6 }
    };
	
	
	// INIT
	
	spawn.buildCourse();
	spawn.reset();
	spawn.frame();
	
	return spawn;
}