// TODO features: display scale; maybe a constellation browser and/or challenge setups with also some tutorial mode
// TODO under the hood: simplify strokes to rerender
function $(q) {
	return document.querySelector(q);
}

function lengthdir_x(len, dir) {
	return len * Math.cos(dir / 180 * Math.PI);
}

function lengthdir_y(len, dir) {
	return len * -Math.sin(dir / 180 * Math.PI);
}

Cart2.prototype.toPagePos = function() {
	return new Cart2(innerWidth / 2 + ((panx + this.x) / scale), innerHeight / 2 + ((pany + this.y) / scale));
}

function saveGame() {
	let gamedata = {
		tps: timeperstepfield.value,
		spr: stepsperrunfield.value,
		scale: scale,
		Athrust: thrustfield.value,
		panx: panx,
		pany: pany,
		focus: focusBody ? focusBody.name : -1,
		bodies: [],
	};

	for (let i in bodies) {
		let b = bodies[i];
		gamedata.bodies.push({
			name: b.name,
			spos: $(`#${b.name}pos`).value,
			svec: $(`#${b.name}vec`).value,
			mass: $(`#${b.name}mass`).value,
			cpos: b.position.toString(),
			cvec: b.velocity.toString(),
		});
		if (b.orientation) {
			gamedata.bodies[gamedata.bodies.length - 1].orientation = b.orientation;
		}
		if (b.nick) {
			gamedata.bodies[gamedata.bodies.length - 1].nick = b.nick;
		}
	}

	location.hash = '#' + JSON.stringify(gamedata);

	if ( ! localStorage.savemsgshown) {
		alert('The game state was successfully encoded into the page link.\nPlease copy and store the link from the address bar to save this state.\nThis message is shown only once.');
		localStorage.savemsgshown = true;
	}
}

function loadGame(data) {
	data = JSON.parse(data);

	for (let i in bodies) {
		removeBody(bodies[i]);
	}

	for (let i in data.bodies) {
		let spositionxy = data.bodies[i].spos.split(',');
		let spositionx = parseFloat(spositionxy[0]);
		let spositiony = parseFloat(spositionxy[1]);
		let svelocityxy = data.bodies[i].svec.split(',');
		let svelocityx = parseFloat(svelocityxy[0]);
		let svelocityy = parseFloat(svelocityxy[1]);
		let cpositionxy = data.bodies[i].cpos.split(',');
		let cpositionx = parseFloat(cpositionxy[0]);
		let cpositiony = parseFloat(cpositionxy[1]);
		let cvelocityxy = data.bodies[i].cvec.split(',');
		let cvelocityx = parseFloat(cvelocityxy[0]);
		let cvelocityy = parseFloat(cvelocityxy[1]);

		let config = {
			name: data.bodies[i].name,
			mass: data.bodies[i].mass,
			position: new Cart2(spositionx, spositiony),
			velocity: new Cart2(svelocityx, svelocityy),
		};
		if ('nick' in data.bodies[i]) {
			config.nick = data.bodies[i].nick;
		}
		if ('orientation' in data.bodies[i]) {
			config.orientation = data.bodies[i].orientation;
		}
		addBody(config);

		bodies[data.bodies[i].name].position = new Cart2(cpositionx, cpositiony);
		bodies[data.bodies[i].name].velocity = new Cart2(cvelocityx, cvelocityy);
	}

	timeperstepfield.value = data.tps;
	stepsperrunfield.value = data.spr;
	thrustfield.value = data.Athrust;
	scale = data.scale;

	if (data.panx) {
		panx = data.panx;
		pany = data.pany;
	}

	if (data.focus && data.focus !== -1) {
		focusBody = bodies[data.focus];
	}
	else {
		focusBody = null;
	}
}

function takeControl(body) {
	if (body.name == 'A') {
		// we're done here
		return;
	}

	let renameFieldSuffixes = 'body velocity vec pos controlgroup mass'.split(' ');
	if ('A' in bodies) {
		// We already have control of another body
		let previouslyA = bodies['A'];
		if ('nick' in bodies['A'] && !(bodies['A'].nick in bodies)) {
			previouslyA.name = bodies['A'].nick;
		}
		else {
			previouslyA.name = getAvailableBodyName();
		}

		previouslyA.innerText = previouslyA.name;

		delete previouslyA.orientation;
		bodies[previouslyA.name] = previouslyA;
		for (let i in renameFieldSuffixes) {
			$(`#A${renameFieldSuffixes[i]}`).id = `${previouslyA.name}${renameFieldSuffixes[i]}`;
		}

		if (body.name != previouslyA.name) {
			delete bodies[body.name];
		}
	}
	else {
		delete bodies[body.name];
	}

	bodies['A'] = body;
	for (let i in renameFieldSuffixes) {
		$(`#${body.name}${renameFieldSuffixes[i]}`).id = `A${renameFieldSuffixes[i]}`;
	}
	body.nick = body.name;
	body.name = 'A';
	body.innerText = body.name;
	body.orientation = 0;
}

function removeBody(body) {
	$("#bodiescontrols").querySelectorAll('span').forEach(function(el) {
		if (el.id == body.name + 'controlgroup') {
			el.parentNode.removeChild(el);
		}
	});
	$("#bodiesspeeds").querySelectorAll('input').forEach(function(el) {
		if (el.id == body.name + 'velocity') {
			el.parentNode.parentNode.removeChild(el.parentNode);
		}
	});
	$("#bodies").removeChild($(`#${body.name}body`));
	delete bodies[body.name];
}

function shoottowardsmouse() {
	// TODO why does this change A's trajectory so much when the new body has a mass of 1 and is sufficiently far away?
	let distance = 25e9; // create the object at this distance from A
	let vel = 343 * 2; // speed at which you fire the shot, approximately mach 2

	let degrees = bodies['A'].position.toPagePos().angle(new Cart2(mouseX, mouseY));
	let config;
	addBody(config = {
		velocity: new Cart2(bodies['A'].velocity).addTo(new Cart2(lengthdir_x(vel, degrees), lengthdir_y(vel, degrees))),
		position: new Cart2(bodies['A'].position).addTo(new Cart2(lengthdir_x(distance, degrees), lengthdir_y(distance, degrees))),
	});
}

function resetSimulation() {
	$("#predictioncanvas").width = $("#trailscanvas").width = $("#predictioncanvas").style.width = $("#trailscanvas").style.width = innerWidth;
	$("#predictioncanvas").height = $("#trailscanvas").height = $("#predictioncanvas").style.height = $("#trailscanvas").style.height = innerHeight;
	panx = 0;
	pany = 0;

	for (let i in bodies) {
		let name = bodies[i].name;
		bodies[i].position = new Cart2(parseFloat($(`#${name}pos`).value.split(',')[0]), parseFloat($(`#${name}pos`).value.split(',')[1]));
		bodies[i].velocity = new Cart2(parseFloat($(`#${name}vec`).value.split(',')[0]), parseFloat($(`#${name}vec`).value.split(',')[1]));
	}
}

function run() {
	rerender_strokes = $("#rerenderinput").checked;
	if (centerZoomTimeout != 0) {
		if (centerZoomTimeout > 0) {
			centerZoomTimeout -= 1;
			$("#centerzoom").style.fontSize = (centerZoomTimeout * CENTERZOOMSCALER).toString() + 'pt';
		}
		else {
			centerZoomTimeout += 1;
			$("#centerzoom").style.fontSize = ((ZOOM_ANIM_DURATION + centerZoomTimeout) * CENTERZOOMSCALER).toString() + 'pt';
		}
		if (centerZoomTimeout == 0) {
			$("#centerzoom").style.display = 'none';
		}
		else {
			centerzoomobj.style.left = `calc(50% - ${centerzoomobj.offsetWidth / 2}px)`;
			centerzoomobj.style.top = `calc(50% - ${centerzoomobj.offsetHeight / 2}px)`;
		}
	}

	let deltatime = 10 * parseFloat(timeperstepfield.value);

	let thrust = new Cart2(0, 0);
	if ('A' in bodies) {
		if (arrowUp) {
			let newtons = parseFloat(thrustfield.value);
			thrust = new Cart2(lengthdir_x(newtons * deltatime / bodies['A'].mass, bodies['A'].orientation - 90), lengthdir_y(newtons * deltatime / bodies['A'].mass, bodies['A'].orientation + 90));
			bodies['A'].classList.add('boosting');
		}
		else {
			bodies['A'].classList.remove('boosting');
		}
		if (arrowLeft) {
			bodies['A'].orientation -= 4.5;
		}
		if (arrowRight) {
			bodies['A'].orientation += 4.5;
		}
	}

	for (let i in bodies) {
		bodies[i].mass = parseFloat($(`#${bodies[i].name}mass`).value);
	}

	if (mouseDown) {
		applyPan(mouseX, mouseY);
	}

	let stepsperrun = parseFloat(stepsperrunfield.value);
	let bodynames = Object.keys(bodies);
	for (let i = 0; i < stepsperrun; i++) {
		if ('A' in bodies) {
			bodies['A'].velocity.addTo(thrust);
		}
		step(bodies, bodynames, deltatime);

		tmpstrokes = [];

		for (let i in bodies) {
			let startPos = new Cart2(bodies[i].position);
			bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
			if (STROKE) {
				tmpstrokes.push({
					startPos: startPos,
					endPos: new Cart2(bodies[i].position),
					boosting: bodies[i] == bodies['A'] && arrowUp,
				});
			}
		}

		if (rerender_strokes) {
			strokes.push(...tmpstrokes);
		}
		else {
			let pan_difference = null;
			if (focusBody) {
				pan_difference = new Cart2(panx - -focusBody.position.x, pany - -focusBody.position.y);
				panx = -focusBody.position.x;
				pany = -focusBody.position.y;
			}

			renderStrokes(tmpstrokes, pan_difference);
		}
	}

	render();

	framecount++;
	requestAnimationFrame(run);
}

function step(bodies, bodynames, deltatime) {
	// calculates the attraction force between each body and updates the velocity vector, but not the position

	let gcdt = deltatime * GravityConstant;
	for (let i in bodynames) {
		for (let j in bodynames) {
			if (i >= j) {
				continue;
			}

			let separation_x = bodies[bodynames[i]].position.x - bodies[bodynames[j]].position.x;
			let separation_y = bodies[bodynames[i]].position.y - bodies[bodynames[j]].position.y;
			let separation = Math.sqrt(separation_x * separation_x + separation_y * separation_y);
			let grav_accel = bodies[bodynames[i]].mass * bodies[bodynames[j]].mass / (separation * separation) * gcdt;
			let dir_x = separation_x / separation;
			let dir_y = separation_y / separation;
			bodies[bodynames[i]].velocity.x -= grav_accel / bodies[bodynames[i]].mass * dir_x;
			bodies[bodynames[i]].velocity.y -= grav_accel / bodies[bodynames[i]].mass * dir_y;
			bodies[bodynames[j]].velocity.x += grav_accel / bodies[bodynames[j]].mass * dir_x;
			bodies[bodynames[j]].velocity.y += grav_accel / bodies[bodynames[j]].mass * dir_y;
		}
	}
}

function render() {
	if (focusBody) {
		panx = -focusBody.position.x;
		pany = -focusBody.position.y;
	}

	for (let i in bodies) {
		if (bodies[i].orientation !== undefined) {
			bodies[i].style.transform = `rotate(${bodies[i].orientation}deg)`;
		}

		let pagepos = bodies[i].position.toPagePos();
		bodies[i].style.left = pagepos.x - (bodies[i].clientWidth / 2);
		bodies[i].style.top = pagepos.y - (bodies[i].clientHeight / 2);

		$(`#${bodies[i].name}velocity`).value = bodies[i].velocity.toString(VELOCITY_DISPLAY_CONFIG);
	}

	if (rerender_strokes && framecount % rerenderEvery == 0) {
		trailscanvasctx.clearRect(0, 0, $("#trailscanvas").width, $("#trailscanvas").height);

		if (strokes.length > MAX_STROKES) {
			strokes.splice(0, strokes.length - MAX_STROKES);
		}

		renderStrokes(strokes);
	}

	if ($("#predictioninput").checked) {
		predictAndDraw();
	}
}

function renderStrokes(strokes, offset) {
	trailscanvasctx.beginPath();
	trailscanvasctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
	let nonblack = false;

	for (let i in strokes) {
		if (strokes[i].boosting && ! nonblack) {
			trailscanvasctx.stroke();
			trailscanvasctx.strokeStyle = 'rgba(255, 0, 0, 1)';
			trailscanvasctx.beginPath();
			nonblack = true;
		}
		else if ( ! strokes[i].boosting && nonblack) {
			trailscanvasctx.stroke();
			trailscanvasctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
			trailscanvasctx.beginPath();
			nonblack = false;
		}
		if (offset) {
			strokes[i].startPos.addTo(offset);
		}
		let spp = strokes[i].startPos.toPagePos();
		let epp = strokes[i].endPos.toPagePos();
		trailscanvasctx.moveTo(spp.x, spp.y);
		trailscanvasctx.lineTo(epp.x, epp.y);
	}
	trailscanvasctx.stroke();
}

function predictAndDraw() {
	let dupbodies = {};
	for (let i in bodies) {
		dupbodies[i] = {
			position: new Cart2(bodies[i].position),
			velocity: new Cart2(bodies[i].velocity),
			mass: bodies[i].mass,
		};
	}


	let deltatime = parseFloat(timeperstepfield.value) * parseFloat($("#predictionaccinput").value);
	let predictsteps = parseFloat(stepsperrunfield.value) * parseFloat($("#predictionstepsinput").value);
	let bodynames = Object.keys(dupbodies);
	predictioncanvasctx.beginPath();
	predictioncanvasctx.clearRect(0, 0, $("#predictioncanvas").width, $("#predictioncanvas").height);
	predictioncanvasctx.strokeStyle = 'rgba(190, 190, 255, 0.8)';
	for (let i = 0; i < predictsteps; i++) {
		step(dupbodies, bodynames, deltatime);
		for (let i in dupbodies) {
			let pp = dupbodies[i].position.toPagePos();
			predictioncanvasctx.moveTo(pp.x, pp.y);

			dupbodies[i].position.addTo(dupbodies[i].velocity.mult(deltatime));

			pp = dupbodies[i].position.toPagePos();
			predictioncanvasctx.lineTo(pp.x, pp.y);
		}
	}
	predictioncanvasctx.stroke();
}

function scenario1() {
	addBody({
		name: 'A',
		mass: '7342e18',
		position: new Cart2(150399000000, 0),
		velocity: new Cart2(0, 30802),
	});
	addBody({
		name: 'S',
		mass: '19885e26',
		position: new Cart2(0, 0),
		velocity: new Cart2(0, 0),
	});
	addBody({
		name: 'E',
		mass: '5.972e24',
		position: new Cart2(150e9, 0),
		velocity: new Cart2(0, 29780),
	});
}

function moon() {
	addBody({
		name: 'M',
		mass: '420e3',
		position: new Cart2(150006838000, 0),
		velocity: new Cart2(0, 37440),
	});
}

function scenario2() {
	for (let i in bodies) {
		removeBody(bodies[i]);
	}

	addBody({name: 'A'});
	addBody({name: 'B'});
	addBody({name: 'E'});
	addBody({name: 'S'});

	$("#timeperstepinput").value = '3';
	$("#stepsperruninput").value = '25';
	$("#thrustinput").value = '1';

	bodies['S'].position = new Cart2(0, 0);
	bodies['S'].velocity = new Cart2(0, 0);
	$("#Smass").value = '5e5';

	$("#Amass").value = '1';
	$("#Avec").value = '0,0.0001';
	$("#Apos").value = '200,0';
	bodies['A'].orientation = 0;

	$("#Bpos").value = '0,-420';
	$("#Bvec").value = '0.000172,0';
	$("#Bmass").value = 6000;

	$("#Epos").value = '0,200';
	$("#Evec").value = '-0.00023,0';
	$("#Emass").value = 6000;

	scale = 1;
	thrustfield.value = '1e-7';

	resetSimulation();
}

function scenario3() {
	for (let i in bodies) {
		removeBody(bodies[i]);
	}

	let vscaler = 0.00000082;

	addBody({
		position: new Cart2(-97.966564648019, 0),
		velocity: new Cart2(1.190653832229 * vscaler, 99.052143194193 * vscaler),
		mass: 10e3,
	});
	addBody({
		position: new Cart2(10.805012998999, 0),
		velocity: new Cart2(0.91101690249 * vscaler, -133.286143310735 * vscaler),
		mass: 10e3,
	});
	addBody({
		position: new Cart2(87.161551684016, 0),
		velocity: new Cart2(-2.101670735083 * vscaler, 34.234000081548 * vscaler),
		mass: 10e3,
	});

	scale = 0.4;
	timeperstepfield.value = 10;
	stepsperrunfield.value = 100;
	thrustfield.value = '1e-6';
	$("#predictionaccinput").value = 1500;
	$("#predictionstepsinput").value = 1;
}

function getAvailableBodyName() {
	let cc = 'A'.charCodeAt(0); // char code
	while (true) {
		let found = false;
		let c = String.fromCharCode(cc);
		for (let i in bodies) {
			if (bodies[i].name == c) {
				found = true;
				break;
			}
		}
		if ( ! found) {
			return c;
		}
		else {
			cc += 1;
		}
	}
}

function tiebreakRequestedBodyName(name) {
	let tiebreaker = '';
	while (name + tiebreaker.toString() in bodies) {
		if (tiebreaker === '') {
			tiebreaker = 2;
		}
		else {
			tiebreaker += 1;
		}
	}
	return name + tiebreaker;
}

function addBody(config) {
	if ( ! config) {
		config = {};
	}

	let newbody = document.createElement('div');

	newbody.name = 'name' in config ? tiebreakRequestedBodyName(config.name) : getAvailableBodyName();
	newbody.mass = 'mass' in config ? config.mass : 1;
	newbody.velocity = config.velocity || new Cart2(0, 0);
	newbody.position = config.position || new Cart2(0, 0);

	if ('orientation' in config) {
		newbody.orientation = config.orientation;
	}

	if ('nick' in config) {
		newbody.nick = config.nick;
	}

	newbody.innerText = newbody.name;
	newbody.id = newbody.name + 'body';

	let controlgroup = document.createElement('span');
	controlgroup.id = newbody.name + 'controlgroup';
	controlgroup.classList.add('collapseable');
	controlgroup.onclick = function(ev) {
		if (ev.target == controlgroup) {
			controlgroup.classList.toggle('collapsed');
		}
	};

	let controlgroupCollapsedName = document.createElement('span');
	controlgroupCollapsedName.innerText = newbody.name;
	controlgroupCollapsedName.classList.add('collapsedLabel');
	controlgroupCollapsedName.onclick = function(ev) {
		if (ev.target == controlgroupCollapsedName) {
			controlgroupCollapsedName.parentNode.classList.toggle('collapsed');
		}
	};
	controlgroup.appendChild(controlgroupCollapsedName);

	let takeControlBtn = document.createElement('input');
	takeControlBtn.type = 'button';
	takeControlBtn.value = 'control';
	takeControlBtn.onclick = function() {
		takeControl(newbody);
	};
	controlgroup.appendChild(takeControlBtn);

	let removeBtn = document.createElement('input');
	removeBtn.type = 'button';
	removeBtn.value = 'remove';
	removeBtn.onclick = function() {
		removeBody(newbody);
	};
	controlgroup.appendChild(removeBtn);

	let tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Mass of object in kg. This value is applied immediately';
	tmpcontrol.innerHTML = `${newbody.name} mass: <input type=number value=${newbody.mass} id=${newbody.name}mass>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start position in m. This value is applied when you restart';
	tmpcontrol.innerHTML = `${newbody.name} position: <input type=text value=${newbody.position.toString()} id=${newbody.name}pos>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start speed in m/s. This value is applied when you restart';
	tmpcontrol.innerHTML = `${newbody.name} vector: <input type=text value=${newbody.velocity.toString()} id=${newbody.name}vec>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.innerHTML = `${newbody.name} speed: <input readonly type=text id=${newbody.name}velocity>`;
	$("#bodiesspeeds").appendChild(tmpcontrol);

	newbody.mass = parseFloat(newbody.mass);

	newbody.onclick = function(ev) {
		focusBody = ev.target;
		advanceIntro(3);
	};

	$("#bodies").appendChild(newbody);
	bodies[newbody.name] = newbody;
	$("#bodiescontrols").appendChild(controlgroup)
}

function applyPan(mouseX, mouseY) {
	if (mouseX == prevMouseX && mouseY == prevMouseY) {
		return;
	}

	panx += (mouseX - prevMouseX) * scale;
	pany += (mouseY - prevMouseY) * scale;
	prevMouseX = mouseX;
	prevMouseY = mouseY;
	focusBody = null;
}

function intro() {
	introStep = 1;
	$("#infobox").innerHTML = '<input type=button value=x title="Next hint" onclick="advanceIntro()"> <strong>Hint:</strong> <span>Use arrow keys to rotate "A" and fire its engine</span>'
}

function advanceIntro(step) {
	if (introStep == -1) { // intro finished/disabled
		return;
	}

	if ( ! step) {
		step = introStep;
	}
	else if (introStep != step) {
		// we got an advance signal, but the user did a different action than the one we were waiting for
		return;
	}

	if (introStep == 1) {
		$("#infobox>span").innerText = 'Scroll to zoom';
		introStep = 2;
	}
	else if (introStep == 2) {
		$("#infobox>span").innerText = 'Click on one of the objects to focus it';
		introStep = 3;
	}
	else if (introStep == 3) {
		$("#infobox>span").innerText = 'Open the "Scenarios" menu for challenges';
		introStep = 4;
	}
	else if (introStep == 4) {
		$("#infobox").innerHTML = '';
		introStep = -1;
		localStorage.introshown = true;
	}
}

function getfps() {
	return framecount / ((performance.now() - starttime) / 1000);
}

function resetfps() {
	starttime = performance.now();
	framecount = 0;
}

let GravityConstant = 6.6742e-11;
let STROKE = true;
let MAX_STROKES = 10e3; // applies only if rerender_strokes is set
let VELOCITY_DISPLAY_CONFIG = {round: true, total: true};
let ZOOMSPEED = 2;
let ZOOM_ANIM_DURATION = 10;
let CENTERZOOMSCALER = 4;

let timeperstepfield = $("#timeperstepinput");
let trailscanvasctx = $("#trailscanvas").getContext('2d');
let predictioncanvasctx = $("#predictioncanvas").getContext('2d');
let clearstrokebtn = $("#clearstroke");
let stepsperrunfield = $("#stepsperruninput");
let thrustfield = $("#thrustinput");
let centerzoomobj = $("#centerzoom");

$("#restartbtn").onclick = resetSimulation;

clearstrokebtn.onclick = function() {
	trailscanvasctx.clearRect(0, 0, $("#trailscanvas").width, $("#trailscanvas").height)
};

document.onkeydown = function(ev) {
	let detected = true;
	switch (ev.key) {
		case 'ArrowUp':
			arrowUp = true;
			advanceIntro(1);
			break;
		case 'ArrowLeft':
			arrowLeft = true;
			advanceIntro(1);
			break;
		case 'ArrowRight':
			arrowRight = true;
			advanceIntro(1);
			break;
		case ' ':
			shoottowardsmouse();
			break;
		default:
			detected = false;
	}
	if (detected) {
		ev.preventDefault();
	}
};

document.onkeyup = function(ev) {
	switch (ev.key) {
		case 'ArrowUp':
			arrowUp = false;
			break;
		case 'ArrowLeft':
			arrowLeft = false;
			break;
		case 'ArrowRight':
			arrowRight = false;
			break;
	}
};

document.onblur = function(ev) {
	arrowUp = false;
	arrowLeft = false;
	arrowRight = false;
	mouseDown = false;
};

document.onmousemove = function(ev) {
	mouseX = ev.clientX;
	mouseY = ev.clientY;
};

$("#predictioncanvas").onmousedown = function(ev) {
	mouseX = ev.clientX;
	mouseY = ev.clientY;
	prevMouseX = mouseX;
	prevMouseY = mouseY;
	mouseDown = true;
};

document.onmouseup = function(ev) {
	if (mouseDown) {
		applyPan(ev.clientX, ev.clientY);
	}
	mouseDown = false;
};

document.addEventListener("wheel", function(ev) {
	let newscale;
	if (ev.deltaY > 0) { 
		newscale = scale / ZOOMSPEED;
		centerZoomTimeout = -ZOOM_ANIM_DURATION;
	}
	else if (ev.deltaY < 0) {
		newscale = scale * ZOOMSPEED;
		centerZoomTimeout = ZOOM_ANIM_DURATION;
	}
	else {
		// horizontal scroll was triggered maybe?
		return;
	}

	centerzoomobj.innerText = '0';
	centerzoomobj.style.display = 'block';

	let newscalestr = parseFloat(newscale).toExponential(0).replace('+', '');
	// TODO display the scale
	newscale = parseFloat(newscale);

	/* TODO see if this works now that the other zoom issue is resolved
	let numPixelsThatWillDropOffTheSide = (innerWidth / scale) - (innerWidth / newscale);
	let ratioToOneSide = (ev.clientX - (innerWidth / 2)) / innerWidth;
	panx += numPixelsThatWillDropOffTheSide * ratioToOneSide;

	let numPixelsThatWillDropOffTheTopOrBottom = (innerHeight / scale) - (innerHeight / newscale);
	let ratioToTopOrBottom = (ev.clientY - (innerHeight / 2)) / innerHeight;
	pany += numPixelsThatWillDropOffTheTopOrBottom * ratioToTopOrBottom;*/

	scale = newscale;
	advanceIntro(2);

	ev.preventDefault();
},
{
	passive: false,
});

$("#addbodybtn").onclick = function() {
	if ('A' in bodies) {
		addBody({
			velocity: new Cart2(bodies['A'].velocity),
			position: new Cart2(bodies['A'].position).addTo(new Cart2(20 * scale, 0)),
		});
	}
	else {
		addBody();
	}
};

$("#predictioninput").onclick = function() {
	predictioncanvasctx.clearRect(0, 0, $("#predictioncanvas").width, $("#predictioncanvas").height);
};

document.querySelectorAll(".collapseable").forEach(function(el) {
	el.onclick = function(ev) {
		if (ev.target == el) {
			el.classList.toggle('collapsed');
			advanceIntro(4);
		}
	};
});

document.querySelectorAll(".collapsedLabel").forEach(function(el) {
	el.onclick = function(ev) {
		if (ev.target == el) {
			el.parentNode.classList.toggle('collapsed');
			advanceIntro(4);
		}
	};
});

let arrowUp = false;
let arrowLeft = false;
let arrowRight = false;
let mouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;
let mouseX = 0;
let mouseY = 0;
let scale = 5e8;
let panx = 0;
let pany = 0;
let focusBody = null;
let centerZoomTimeout = 0;
let rerender_strokes = false;
let rerenderEvery = 2;
let strokes = [];
let framecount = 0;
let starttime = performance.now();
let introStep = -1;

let bodies = {};

resetSimulation();

if (location.hash.length > 2) {
	loadGame(unescape(location.hash.substring(1)));
}
else {
	scenario3();
	bodies['A'].orientation = 0;
}

if ( ! localStorage.introshown) {
	intro();
}

requestAnimationFrame(run);

