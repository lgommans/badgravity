// TODO features: future path calculation, maybe a constellation browser and/or challenge setups with also some tutorial mode
// TODO under the hood: saving/loading of bodies (mainly by allowing to remove/rename bodies and figuring something for cvec/cpos that are currently unused), simplify strokes to rerender
// TODO meta: put it on a version control for people to contribute more easily if they wish
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
	}

	location.hash = '#' + JSON.stringify(gamedata);

	if ( ! localStorage.savemsgshown) {
		alert('The game state was successfully encoded into the page link.\nPlease copy and store the link from the address bar to save this state.\nThis message is shown only once.');
		localStorage.savemsgshown = true;
	}
}

function loadGame(data) {
	data = JSON.parse(data);

	timeperstepfield.value = data.tps;
	stepsperrunfield.value = data.spr;
	thrustfield.value = data.Athrust;
	if (data.panx) {
		panx = data.panx;
		pany = data.pany;
	}

	if (bodies.length > data.bodies.length) {
		alert('Cannot fully load game data: removing bodies not yet supported and your local game already has more than are in the save.');
		// At least move the other one(s) out of the way..
		for (let i in bodies) {
			bodies[i].position = new Cart2(-1e40, -1e40);
			bodies[i].velocity = new Cart2(0, 0);
			$(`#${bodies[i].name}vec`).value = '0,0';
			$(`#${bodies[i].name}pos`).value = '-1e40,-1e40';
			$(`#${bodies[i].name}mass`).value = '0';
		}
	}

	while (bodies.length < data.bodies.length) {
		addBody(); // don't care about params, we're going to override them anyway
	}

	for (let datai in data.bodies) {
		// Because the controls aren't bound to a body and I can't change the name easily atm, let's just find a matching one.
		// The way names are generated, everyone with the same body count should have the same bodies' names as well. So it should work... until we change something in the game.
		let found = false;
		datai = parseInt(datai);
		for (let locali in bodies) {
			if (bodies[locali].innerText == data.bodies[datai].name) {
				let b = data.bodies[datai];

				bodies[locali].position = new Cart2(b.cpos.x, b.cpos.y);
				bodies[locali].velocity = new Cart2(b.cvec.x, b.cvec.y);
				$(`#${bodies[locali].name}vec`).value = b.svec;
				$(`#${bodies[locali].name}pos`).value = b.spos;
				$(`#${bodies[locali].name}mass`).value = b.mass;

				found = true;
				break;
			}
		}

		if ( ! found) {
			// If you get this error, well, the data is there, you can restore it if you improve the restoring process...
			alert('Loading error due to my shitty setup: did not find a matching body for one of the savegame bodies');
		}
	}
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
	$("canvas").width = innerWidth;
	$("canvas").height = innerHeight;
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

	let thrust = 0;
	if (arrowUp) {
		thrust = parseFloat(thrustfield.value);
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

	for (let i in bodies) {
		bodies[i].mass = parseFloat($(`#${bodies[i].name}mass`).value);
	}

	if (mouseDown) {
		applyPan(mouseX, mouseY);
	}

	let deltatime = 10 * parseFloat(timeperstepfield.value);
	let stepsperrun = parseFloat(stepsperrunfield.value);
	for (let i = 0; i < stepsperrun; i++) {
		bodies['A'].velocity.addTo(new Cart2(lengthdir_x(thrust * deltatime / bodies['A'].mass, bodies['A'].orientation - 90), lengthdir_y(thrust * deltatime / bodies['A'].mass, bodies['A'].orientation + 90)));
		step(deltatime, deltatime * GravityConstant);
	}

	render();

	framecount++;
	requestAnimationFrame(run);
}

function step(deltatime, gcdt) {
	for (let i in bodies) {
		for (let j in bodies) {
			if (i >= j) {
				continue;
			}

			let separation_x = bodies[i].position.x - bodies[j].position.x;
			let separation_y = bodies[i].position.y - bodies[j].position.y;
			let separation = Math.sqrt(separation_x * separation_x + separation_y * separation_y);
			let grav_accel = bodies[i].mass * bodies[j].mass / (separation * separation) * gcdt;
			let dir_x = separation_x / separation;
			let dir_y = separation_y / separation;
			bodies[i].velocity.x -= grav_accel / bodies[i].mass * dir_x;
			bodies[i].velocity.y -= grav_accel / bodies[i].mass * dir_y;
			bodies[j].velocity.x += grav_accel / bodies[j].mass * dir_x;
			bodies[j].velocity.y += grav_accel / bodies[j].mass * dir_y;
		}
	}

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
		canvasctx.clearRect(0, 0, $("canvas").width, $("canvas").height);

		if (strokes.length > MAX_STROKES) {
			strokes.splice(0, strokes.length - MAX_STROKES);
		}

		renderStrokes(strokes);
	}
}

function renderStrokes(strokes, offset) {
	canvasctx.beginPath();
	canvasctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
	let nonblack = false;

	for (let i in strokes) {
		if (strokes[i].boosting && ! nonblack) {
			canvasctx.stroke();
			canvasctx.strokeStyle = 'rgba(255, 0, 0, 1)';
			canvasctx.beginPath();
			nonblack = true;
		}
		else if ( ! strokes[i].boosting && nonblack) {
			canvasctx.stroke();
			canvasctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
			canvasctx.beginPath();
			nonblack = false;
		}
		if (offset) {
			strokes[i].startPos.addTo(offset);
		}
		canvasctx.moveTo(strokes[i].startPos.toPagePos().x, strokes[i].startPos.toPagePos().y);
		canvasctx.lineTo(strokes[i].endPos.toPagePos().x, strokes[i].endPos.toPagePos().y);
	}
	canvasctx.stroke();
}

function scenario1() {
	addBody({
		name: 'A',
		mass: '420e3',
		position: new Cart2(150006838000, 0),
		velocity: new Cart2(0, 37440),
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

function scenario2() {
	while (bodies.length < 4) {
		addBody();
	}

	$("#timeperstepinput").value = '3';
	$("#stepsperruninput").value = '25';
	$("#thrustinput").value = '1';

	bodies['S'].position = new Cart2(0, 0);
	bodies['S'].velocity = new Cart2(0, 0);
	$("#Smass").value = '5e5';

	$("#Amass").value = '1';
	$("#Avec").value = '0,0.0001';
	$("#Apos").value = '200,0';

	$("#Cpos").value = '0,-420';
	$("#Cvec").value = '0.000172,0';
	$("#Cmass").value = 6000;

	$("#Epos").value = '0,200';
	$("#Evec").value = '-0.00023,0';
	$("#Emass").value = 6000;

	scale = 1;

	resetSimulation();
}

function getAvailableBodyName() {
	let cc = 'B'.charCodeAt(0); // char code
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

function addBody(config) {
	if ( ! config) {
		config = {};
	}

	let newbody = document.createElement('div');
	newbody.name = config.name || getAvailableBodyName();
	newbody.mass = config.mass || 1;
	newbody.velocity = config.velocity || new Cart2(bodies['A'].velocity);
	newbody.position = config.position || new Cart2(bodies['A'].position).addTo(new Cart2(0, 10));

	newbody.innerText = newbody.name;
	newbody.id = newbody.name + 'body';

	let controlgroup = document.createElement('span');
	controlgroup.id = 'controlgroup' + newbody.name;
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

	let tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Mass of object in kg. This value is applied immediately';
	tmpcontrol.innerHTML = `${newbody.name} mass=<input type=number value=${newbody.mass} id=${newbody.name}mass>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start position in m. This value is applied when you restart';
	tmpcontrol.innerHTML = `${newbody.name} position=<input type=text value=${newbody.position.toString()} id=${newbody.name}pos>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start speed in m/s. This value is applied when you restart';
	tmpcontrol.innerHTML = `${newbody.name} vector=<input type=text value=${newbody.velocity.toString()} id=${newbody.name}vec>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.innerHTML = `${newbody.name} speed=<input readonly type=text id=${newbody.name}velocity>`;
	$("#bodiesspeeds").appendChild(tmpcontrol);

	newbody.mass = parseFloat(newbody.mass);

	newbody.onclick = function(ev) {
		focusBody = ev.target;
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

function getfps() {
	console.log(framecount / ((performance.now() - starttime) / 1000));
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
let canvasctx = $("canvas").getContext('2d');
let clearstrokebtn = $("#clearstroke");
let stepsperrunfield = $("#stepsperruninput");
let thrustfield = $("#thrustinput");
let centerzoomobj = $("#centerzoom");

$("#restartbtn").onclick = resetSimulation;

clearstrokebtn.onclick = function() {
	canvasctx.clearRect(0, 0, $("canvas").width, $("canvas").height)
};

document.onkeydown = function(ev) {
	let detected = true;
	switch (ev.key) {
		case 'ArrowUp':
			arrowUp = true;
			break;
		case 'ArrowLeft':
			arrowLeft = true;
			break;
		case 'ArrowRight':
			arrowRight = true;
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

$("canvas").onmousedown = function(ev) {
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

	ev.preventDefault();
},
{
	passive: false,
});

$("#scenario2btn").onclick = scenario2;

$("#addbodybtn").onclick = function() {
	addBody({
		velocity: new Cart2(bodies['A'].velocity),
		position: new Cart2(bodies['A'].position).addTo(new Cart2(20, 0)),
	});
};

document.querySelectorAll(".collapseable").forEach(function(el) {
	el.onclick = function(ev) {
		if (ev.target == el) {
			el.classList.toggle('collapsed');
		}
	};
});

document.querySelectorAll(".collapsedLabel").forEach(function(el) {
	el.onclick = function(ev) {
		if (ev.target == el) {
			el.parentNode.classList.toggle('collapsed');
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
let scale = 1e9;
let panx = 0;
let pany = 0;
let focusBody = null;
let centerZoomTimeout = 0;
let rerender_strokes = false;
let rerenderEvery = 2;
let strokes = [];
let framecount = 0;
let starttime = performance.now();

let bodies = {};

if (location.hash.length > 2) {
	loadGame(unescape(location.hash.substring(1)));
}
else {
	scenario1();
	bodies['A'].orientation = 0;
}

resetSimulation();
requestAnimationFrame(run);

