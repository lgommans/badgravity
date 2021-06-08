// TODO under the hood: simplify strokes to rerender; fix saving of trails mode (non/rel/abs)
Cart2.prototype.toPagePos = function() {
	return new Cart2(innerWidth / 2 + ((panx + this.x) / scale), innerHeight / 2 + ((pany + this.y) / scale));
}

function saveScenario() {
	let scenariodata = {
		timeperstep: timeperstepfield.value,
		stepsperrun: stepsperrunfield.value,
		scale: scale,
		thrust: thrustfield.value,
		predict: $("#predictioninput").checked ? 1 : 0,
		predictionsteps: $("#predictionstepsinput").value,
		predictionacc: $("#predictionaccinput").value,
		panx: panx,
		pany: pany,
		focus: focusBody ? focusBody.name : -1,
		bodies: {},
	};

	for (let i in bodies) {
		let b = bodies[i];
		scenariodata.bodies[b.name] = {
			position: {x: b.position.x, y: b.position.y},
			velocity: {x: b.velocity.x, y: b.velocity.y},
			mass: $(`#${b.name}mass`).value,
		};
		if ('thrust' in b) {
			scenariodata.bodies[b.name].thrust = b.thrust;
		}
		if ('orientation' in b) {
			scenariodata.bodies[b.name].orientation = b.orientation;
		}
		if ('nick' in b) {
			scenariodata.bodies[b.name].nick = b.nick;
		}
		if ('title' in b) {
			scenariodata.bodies[b.name].hover = b.title;
		}
	}

	location.hash = '#' + JSON.stringify(scenariodata);

	if ( ! localStorage.savemsgshown) {
		alert('The simulation state has been encoded into the page link.\nPlease copy and store the link from the address bar to save this scenario.\nThis message is shown only once.');
		localStorage.savemsgshown = true;
	}
}

function startScenario(data) {
	for (let i in bodies) {
		removeBody(bodies[i]);
	}

	clearCanvas(trailscanvasctx);

	addScenario(data);
}

function addScenario(data) {
	for (let i in data.bodies) {
		let config = {
			name: i,
			mass: data.bodies[i].mass,
			position: new Cart2(data.bodies[i].position),
			velocity: new Cart2(data.bodies[i].velocity),
		};
		if ('nick' in data.bodies[i]) {
			config.nick = data.bodies[i].nick;
		}
		if ('orientation' in data.bodies[i]) {
			config.orientation = data.bodies[i].orientation;
		}
		if ('orientation' in data.bodies[i]) {
			config.thrust = data.bodies[i].thrust;
		}
		if ('hover' in data.bodies[i]) {
			config.hoverText = data.bodies[i].hover;
		}
		if ('relativeTo' in data.bodies[i]) {
			let t = data.bodies[i].relativeTo;
			if (t in bodies) {
				config.position.addTo(new Cart2(parseFloat($(`#${t}pos`).value.split(',')[0]), parseFloat($(`#${t}pos`).value.split(',')[1])));
				config.velocity.addTo(new Cart2(parseFloat($(`#${t}vec`).value.split(',')[0]), parseFloat($(`#${t}vec`).value.split(',')[1])));
			}
		}

		let newbody = addBody(config);

		if ('relativeTo' in data.bodies[i]) {
			let t = data.bodies[i].relativeTo;
			if (t in bodies) {
				newbody.position = new Cart2(bodies[t].position);
				newbody.position.addTo(data.bodies[i].position);
				newbody.velocity = new Cart2(bodies[t].velocity);
				newbody.velocity.addTo(data.bodies[i].velocity);
			}
			else {
				alert(`${i} is meant to orbit ${t}, but ${t} was not found. It will instead spawn relative to the center of the screen.\nYou may want to adjust its parameters in the Bodies menu.`);
			}
		}

		if ('removeIfCloserThanTo' in data.bodies[i]) {
			newbody.removeIfCloserThanTo = data.bodies[i].removeIfCloserThanTo;
		}
	}

	if ('scale' in data) {
		setScale(data.scale);
	}
	if ('maxTPS' in data) {
		if (parseFloat(timeperstepfield.value) > data.maxTPS) {
			timeperstepfield.value = data.maxTPS;
		}
	}
	if ('timeperstep' in data) {
		timeperstepfield.value = data.timeperstep;
	}
	if ('stepsperrun' in data) {
		stepsperrunfield.value = data.stepsperrun;
	}
	if ('predict' in data) {
		$("#predictioninput").checked = data.predict == 1 ? true : false;
		clearCanvas(predictioncanvasctx); // if predict is off now, it will not clear otherwise. And if it's on, we'll draw over it anyway.
	}
	if ('predictionacc' in data) {
		$("#predictionaccinput").value = data.predictionacc;
	}
	if ('predictionsteps' in data) {
		$("#predictionstepsinput").value = data.predictionsteps;
	}
	if ('thrust' in data) {
		thrustfield.value = data.thrust;
	}
	else if ('A' in bodies && 'thrust' in bodies['A']) {
		thrustfield.value = bodies['A'].thrust;
	}

	if ('panx' in data) {
		panx = data.panx;
		pany = data.pany;
	}

	if ('focus' in data) {
		focusBody = (data.focus === -1 ? null : bodies[data.focus]);
		setTimeout(clearstrokebtn.onclick, 50);
	}

	if ('trails' in data) {
		trailmodefield.value = data.trails;
	}

	if ('infos' in data) {
		infosQueue = data.infos;
		infosQueue.push(null);
		advanceInfos();
	}
}

function takeControl(body) {
	if (body.thrust) {
		thrustfield.value = body.thrust;
	}

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
		$('#Acontrolgroup>.collapsedLabel').innerText = previouslyA.name;
		$('#Acontrolgroup').querySelectorAll('label>span').forEach(function(el) {
			el.innerText = previouslyA.name;
		});
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
	$('#Acontrolgroup>.collapsedLabel').innerText = 'A';
	$('#Acontrolgroup').querySelectorAll('label>span').forEach(function(el) {
		el.innerText = 'A';
	});
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
	if (trailmodefield.value == 'rel') {
		draw_strokes = true;
		rerender_strokes = false;
	}
	else if (trailmodefield.value == 'non') {
		draw_strokes = false;
		rerender_strokes = false;
	}
	else if (trailmodefield.value == 'abs') {
		draw_strokes = true;
		rerender_strokes = true;
	}

	if (zoomIndicatorReset > 0) {
		zoomIndicatorReset -= 1;
		if (zoomIndicatorReset == 0) {
			scaledisplay.style.fontSize = '1em';
		}
	}

	let deltatime = 10 * parseFloat(timeperstepfield.value);

	let thrust = new Cart2(0, 0);
	if ('A' in bodies) {
		if (arrowUp) {
			let newtons = parseFloat(thrustfield.value);
			thrust = new Cart2(lengthdir_x(newtons * deltatime / bodies['A'].mass, bodies['A'].orientation - 90), lengthdir_y(newtons * deltatime / bodies['A'].mass, bodies['A'].orientation + 90));
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

		let queueRemoval = [];
		for (let i in bodies) {
			if (bodies[i].removeIfCloserThanTo) {
				let rictt = bodies[i].removeIfCloserThanTo;
				if (rictt[1] in bodies) {
					if (bodies[rictt[1]].position.sub(bodies[i].position).abs() < rictt[0]) {
						removeBody(bodies[i]);
						delete bodynames[bodynames.indexOf(i)];
						continue;
					}
				}
			}

			let startPos = new Cart2(bodies[i].position);
			bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
			if (draw_strokes) {
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
	if ( ! draw_strokes) {
		return;
	}

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

	if ('thrust' in config) {
		newbody.thrust = config.thrust;
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

	let followBtn = document.createElement('input');
	followBtn.type = 'button';
	followBtn.value = 'follow';
	followBtn.onclick = function() {
		focusBody = newbody;
	};
	controlgroup.appendChild(followBtn);

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
	tmpcontrol.innerHTML = `<span>${newbody.name}</span> mass: <input type=number value=${newbody.mass} id=${newbody.name}mass>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start position in m. This value is applied when you restart';
	tmpcontrol.innerHTML = `<span>${newbody.name}</span> position: <input type=text value=${newbody.position.toString()} id=${newbody.name}pos>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start speed in m/s. This value is applied when you restart';
	tmpcontrol.innerHTML = `<span>${newbody.name}</span> vector: <input type=text value=${newbody.velocity.toString()} id=${newbody.name}vec>`;
	controlgroup.appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'absolute speed in m/s';
	tmpcontrol.innerHTML = `<span>${newbody.name}</span> speed: <input readonly type=text id=${newbody.name}velocity>`;
	$("#bodiesspeeds").appendChild(tmpcontrol);

	if ('hoverText' in config) {
		newbody.title = config.hoverText;
		controlgroupCollapsedName.title = config.hoverText;
		tmpcontrol.title = `${config.hoverText}'s absolute speed in m/s`;
	}

	newbody.mass = parseFloat(newbody.mass);

	newbody.onclick = function(ev) {
		focusBody = ev.target;
		advanceInfos(3);
	};

	$("#bodies").appendChild(newbody);
	bodies[newbody.name] = newbody;
	$("#bodiescontrols").appendChild(controlgroup)

	if ('A' in bodies && ! ('orientation' in bodies['A'])) {
		// Check that, if we have an A at least, we can control it
		bodies['A'].orientation = 0;
	}

	return newbody;
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
	infosQueue = [
		'[b]Hint:[/b] Use arrow keys to rotate "A" and fire its engine',
		'[b]Hint:[/b] Scroll to zoom',
		'[b]Hint:[/b] Click on one of the objects to focus it',
		'[b]Hint:[/b] Use the "Clear trails" button to clean up the screen',
		"[b]Hint:[/b] Prediction lines don't match in relative reference frames (following an object), enable absolute motion trails in Simulator controls",
		'[b]Hint:[/b] Open the "Scenarios" menu for challenges',
	];
	introStep = 0;
	advanceInfos();
}

function formatInfo(infomsg) {
	$("#infobox").innerHTML = '<input type=button value=&raquo; title="Next hint" onclick="advanceInfos()"> ' + BBCode(escapeHtml(infomsg));
}

function advanceInfos(step) {
	if (introStep == -1) {
		// tutorial finished/disabled
		if (infosQueue.length > 0 && step === undefined) {
			if (infosQueue[0] === null) {
				$("#infobox").innerHTML = '';
			}
			else {
				formatInfo(infosQueue.shift());
			}
		}
		return;
	}

	// we're doing the intro tutorial

	if ( ! step) {
		step = introStep;
	}
	else if (introStep != step) {
		// we got an advance signal, but the user did a different action than the one we were waiting for
		return;
	}

	if (infosQueue.length > 0) {
		introStep += 1;
		formatInfo(infosQueue.shift());
	}
	else if (introStep == 6) {
		$("#infobox").innerHTML = '';
		introStep = -1;
		localStorage.introshown = true;
	}
}

function setScale(newscale) {
	scale = newscale;
	scaleobj.innerText = (scale * 75).toSIPrefix('m');
	scaleobj.title = `1 pixel = ${scale.toExponential()} meters`;
}

function getfps() {
	return framecount / ((performance.now() - starttime) / 1000);
}

function resetfps() {
	starttime = performance.now();
	framecount = 0;
}

function clearCanvas(ctx) {
	ctx.clearRect(0, 0, $("#trailscanvas").width, $("#trailscanvas").height);
}

let GravityConstant = 6.6742e-11;
let MAX_STROKES = 10e3; // applies only if rerender_strokes is set
let VELOCITY_DISPLAY_CONFIG = {round: true, total: true};
let ZOOMSPEED = 2;
let ZOOM_INDICATOR_DURATION = 8;

let timeperstepfield = $("#timeperstepinput");
let stepsperrunfield = $("#stepsperruninput");
let trailscanvasctx = $("#trailscanvas").getContext('2d');
let predictioncanvasctx = $("#predictioncanvas").getContext('2d');
let clearstrokebtn = $("#clearstroke");
let thrustfield = $("#thrustinput");
let trailmodefield = $("#trailmodeinput");
let scaleobj = $("#scaledisplay");
let playpauseobj = $("#playpause");

$("#restartbtn").onclick = resetSimulation;

playpauseobj.onclick = function() {
	if (playpauseobj.value == '||') {
		// No unicode pause symbol because it renders in bright orange on android and has crazy spacing on linux. Maybe if this improves one day... &#x23F8; and for play maybe 23F5
		playpauseobj.previousSPR = stepsperrunfield.value;
		stepsperrunfield.value = 0;
		playpauseobj.value = '▸';
	}
	else {
		stepsperrunfield.value = playpauseobj.previousSPR;
		playpauseobj.value = '||';
	}
}

clearstrokebtn.onclick = function() {
	clearCanvas(trailscanvasctx);
	advanceInfos(4);
};

document.onkeydown = function(ev) {
	let detected = true;
	switch (ev.key) {
		case 'ArrowUp':
			arrowUp = true;
			if ('A' in bodies) {
				bodies['A'].classList.add('boosting');
			}
			advanceInfos(1);
			break;
		case 'ArrowLeft':
			arrowLeft = true;
			advanceInfos(1);
			break;
		case 'ArrowRight':
			arrowRight = true;
			advanceInfos(1);
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
			if ('A' in bodies) {
				bodies['A'].classList.remove('boosting');
			}
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
	if ('A' in bodies) {
		bodies['A'].classList.remove('boosting');
	}
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
	if (ev.deltaY < 0) {
		newscale = scale / ZOOMSPEED;
		zoomIndicatorReset = ZOOM_INDICATOR_DURATION;
		$("#scaledisplay").style.fontSize = '1.2em';
	}
	else if (ev.deltaY > 0) {
		newscale = scale * ZOOMSPEED;
		zoomIndicatorReset = ZOOM_INDICATOR_DURATION;
		$("#scaledisplay").style.fontSize = '0.8em';
	}
	else {
		// horizontal scroll was triggered maybe?
		return;
	}

	let newscalestr = parseFloat(newscale).toExponential(0).replace('+', '');
	newscale = parseFloat(newscale);

	/* TODO see if this works now that the other zoom issue is resolved
	let numPixelsThatWillDropOffTheSide = (innerWidth / scale) - (innerWidth / newscale);
	let ratioToOneSide = (ev.clientX - (innerWidth / 2)) / innerWidth;
	panx += numPixelsThatWillDropOffTheSide * ratioToOneSide;

	let numPixelsThatWillDropOffTheTopOrBottom = (innerHeight / scale) - (innerHeight / newscale);
	let ratioToTopOrBottom = (ev.clientY - (innerHeight / 2)) / innerHeight;
	pany += numPixelsThatWillDropOffTheTopOrBottom * ratioToTopOrBottom;*/

	setScale(newscale);
	advanceInfos(2);

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

$("#trailmodeinput").onchange = function() {
	advanceInfos(5);
}

$("#predictioninput").onclick = function() {
	clearCanvas(predictioncanvasctx);
};

document.querySelectorAll(".collapseable").forEach(function(el) {
	el.onclick = function(ev) {
		if (ev.target == el) {
			el.classList.toggle('collapsed');
			if (el == $("#controls")) {
				if (el.classList.contains('collapsed')) {
					$("#scaledisplay").style.display = 'none';
				}
				else {
					$("#scaledisplay").style.display = 'inline-block';
				}
			}
			advanceInfos(6);
		}
	};
});

document.querySelectorAll(".collapsedLabel").forEach(function(el) {
	el.onclick = function(ev) {
		if (ev.target == el) {
			el.parentNode.classList.toggle('collapsed');
			if (ev.target.parentNode == $("#controls")) {
				if (ev.target.parentNode.classList.contains('collapsed')) {
					$("#scaledisplay").style.display = 'none';
				}
				else {
					$("#scaledisplay").style.display = 'inline-block';
				}
			}
			advanceInfos(6);
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
let panx = 0;
let pany = 0;
let focusBody = null;
let zoomIndicatorReset = 0;
let rerender_strokes = false;
let rerenderEvery = 2;
let strokes = [];
let framecount = 0;
let starttime = performance.now();
let introStep = -1;
let infosQueue = [];
let draw_strokes = true;
let scale;

let bodies = {};

setScale(1);
resetSimulation();

let loadScenario = null;
if (location.hash.length > 2) {
	if (location.hash.substring(1).startsWith('scenario=')) {
		loadScenario = location.hash.split('=', 2)[1];
	}
	else {
		startScenario(JSON.parse(unescape(location.hash.substring(1))));
	}
}
else {
	loadScenario = '3-body_choreography';
	thrustfield.value = '1e-6';
	timeperstepfield.value = 10;
	stepsperrunfield.value = 100;
	$("#predictionaccinput").value = 1500;
	$("#predictionstepsinput").value = 1;
}

if ( ! localStorage.introshown) {
	intro();
}

fetch('res/scenarios.json').then(response => response.json()).then(function(scenarios) {
	let loadedScenario = false;
	for (let i in scenarios) {
		let span = document.createElement('span');
		span.classList.add('scenario');
		span.innerText = scenarios[i].title

		let button = document.createElement('input');
		button.type = 'button';
		button.value = '+';
		button.title = 'Add this scenario into current scenario'
		button.onclick = function() {
			addScenario(scenarios[i]);
		};
		span.appendChild(button);

		button = document.createElement('input');
		button.type = 'button';
		button.title = 'Start scenario, replacing current scenario'
		button.value = '‣';
		button.onclick = function() {
			startScenario(scenarios[i]);
		};
		span.appendChild(button);

		$("#scenarioslist").appendChild(span);
		$("#scenarioslist").appendChild(document.createElement('br'));

		if (loadScenario && loadScenario == scenarios[i].title.replace(/ /g, '_')) {
			loadedScenario = true;
			startScenario(scenarios[i]);
		}
	}

	if (loadScenario && ! loadedScenario) {
		alert('To-be-loaded scenario not found: ' + loadScenario + '\nSee the Scenarios menu on the left to select another.');
	}
});

requestAnimationFrame(run);

