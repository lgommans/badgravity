function $(q) {
	return document.querySelector(q);
}

function time() {
	return new Date().getTime();
}

function lengthdir_x(len, dir) {
	return len * Math.cos(dir / 180 * Math.PI);
}

function lengthdir_y(len, dir) {
	return len * -Math.sin(dir / 180 * Math.PI);
}

Cart2.prototype.toPagePos = function() {
	return new Cart2((innerWidth / 2) + (this.x / scale), (innerHeight / 2) + (this.y / scale));
}

function saveGame() {
	let gamedata = {
		tps: timeperstepfield.value,
		spr: stepsperrunfield.value,
		scale: scale,
		Aaccel: accelfield.value,
		fixedSun: fixedSun,
		bodies: [],
	};

	for (let i in bodies) {
		let b = bodies[i];
		gamedata.bodies.push({
			name: b.innerText,
			spos: $(`#${b.innerText}pos`).value,
			svec: $(`#${b.innerText}vec`).value,
			mass: $(`#${b.innerText}mass`).value,
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
	$("#scaleinput").value = data.scale;
	accelfield.value = data.Aaccel;
	fixedSun = data.fixedSun;

	if (bodies.length > data.bodies.length) {
		alert('Cannot fully load game data: removing bodies not yet supported and your local game already has more than are in the save.');
		// At least move the other one(s) out of the way..
		for (let i in bodies) {
			bodies[i].position = new Cart2(-1e40, -1e40);
			bodies[i].velocity = new Cart2(0, 0);
			$(`#${bodies[i].innerText}vec`).value = '0,0';
			$(`#${bodies[i].innerText}pos`).value = '-1e40,-1e40';
			$(`#${bodies[i].innerText}mass`).value = '0';
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
				$(`#${bodies[locali].innerText}vec`).value = b.svec;
				$(`#${bodies[locali].innerText}pos`).value = b.spos;
				$(`#${bodies[locali].innerText}mass`).value = b.mass;

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

	let degrees = $("#Abody").position.toPagePos().angle(new Cart2(mouseX, mouseY));
	let config;
	addBody(config = {
		velocity: new Cart2($("#Abody").velocity).addTo(new Cart2(lengthdir_x(vel, degrees), lengthdir_y(vel, degrees))),
		position: new Cart2($("#Abody").position).addTo(new Cart2(lengthdir_x(distance, degrees), lengthdir_y(distance, degrees))),
	});
}

function resetSimulation() {
	$("canvas").width = innerWidth;
	$("canvas").height = innerHeight;
	scale = parseFloat($("#scaleinput").value);

	for (let i in bodies) {
		let name = bodies[i].innerText;
		bodies[i].position = new Cart2(parseFloat($(`#${name}pos`).value.split(',')[0]), parseFloat($(`#${name}pos`).value.split(',')[1]));
		bodies[i].velocity = new Cart2(parseFloat($(`#${name}vec`).value.split(',')[0]), parseFloat($(`#${name}vec`).value.split(',')[1]));
	}
}

function run() {
	if (arrowUp) {
		let accel = parseFloat(accelfield.value);
		iss.velocity.addTo(new Cart2(lengthdir_x(accel, iss.orientation - 90), lengthdir_y(accel, iss.orientation + 90)));
		iss.classList.add('boosting');
	}
	else {
		iss.classList.remove('boosting');
	}
	if (arrowLeft) {
		iss.orientation -= 4.5;
	}
	if (arrowRight) {
		iss.orientation += 4.5;
	}

	for (let i in bodies) {
		let name = bodies[i].innerText;
		bodies[i].mass = parseFloat($(`#${name}mass`).value);
	}

	stepsperrun = parseFloat(stepsperrunfield.value);
	for (let i = 0; i < stepsperrun; i++) {
		step();
	}

	for (let i in bodies) {
		let name = bodies[i].innerText;

		if (bodies[i].orientation !== undefined) {
			bodies[i].style.transform = `rotate(${bodies[i].orientation}deg)`;
		}

		let pagepos = bodies[i].position.toPagePos();
		bodies[i].style.left = pagepos.x - (bodies[i].clientWidth / 2);
		bodies[i].style.top = pagepos.y - (bodies[i].clientHeight / 2);

		$(`#${name}velocity`).value = bodies[i].velocity.toString(VELOCITY_DISPLAY_CONFIG);
	}

	//framecount++;
	requestAnimationFrame(run);
}

function step() {
	let deltatime = 10 * parseFloat(timeperstepfield.value);

	let prevpositions = {};
	for (let i in bodies) {
		prevpositions[i] = bodies[i].position.toPagePos();
	}

	for (let i in bodies) {
		for (let j in bodies) {
			if (i >= j) {
				// compute every body pair once
				continue;
			}

			if (fixedSun && bodies[i] == sun) {
				continue;
			}

			let separation = bodies[i].position.sub(bodies[j].position).abs();

			let masses = bodies[i].mass * bodies[j].mass;
			let grav_accel = GravityConstant * (masses / Math.pow(separation, 2)) * deltatime;
			let degrees = bodies[i].position.angle(bodies[j].position);
			bodies[i].velocity.addTo(new Cart2(lengthdir_x(grav_accel / bodies[i].mass, degrees), lengthdir_y(grav_accel / bodies[i].mass, degrees)));
			degrees += 180;
			bodies[j].velocity.addTo(new Cart2(lengthdir_x(grav_accel / bodies[j].mass, degrees), lengthdir_y(grav_accel / bodies[j].mass, degrees)));

			if ( ! window.first || window.first < 10) {
				console.log('computing', bodies[i].innerText, bodies[j].innerText, new Cart2(lengthdir_x(grav_accel / bodies[i].mass, degrees), lengthdir_y(grav_accel / bodies[i].mass, degrees)), new Cart2(lengthdir_x(grav_accel / bodies[j].mass, degrees), lengthdir_y(grav_accel / bodies[j].mass, degrees)));
			}
		}
	}

	if ( ! window.first) window.first = 0;
	window.first++;
	for (let i in bodies) {
		bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
	}

	if (STROKE) {
		for (let i in bodies) {
			let pagepos = bodies[i].position.toPagePos();
			canvasctx.beginPath();
			canvasctx.moveTo(prevpositions[i].x, prevpositions[i].y);
			if (bodies[i] == iss && arrowUp) {
				canvasctx.strokeStyle = `rgba(255, 0, 0, 1)`;
			}
			else {
				canvasctx.strokeStyle = `rgba(0, 0, 0, 0.7)`;
			}
			canvasctx.lineTo(pagepos.x, pagepos.y);
			canvasctx.stroke();
		}
	}
}

function scenario2() {
	$("#bodies").style.fontSize = '0.65em';

	while (bodies.length < 4) {
		addBody();
	}

	$("#timeperstepinput").value = '3';
	$("#stepsperruninput").value = '25';
	$("#accelinput").value = '1';

	fixedSun = true;
	sun.position = new Cart2(0, 0);
	sun.velocity = new Cart2(0, 0);
	$("#Smass").value = '5e5';

	$("#Amass").value = '1';
	$("#Avec").value = '0,0.0001';

	$("#Bpos").value = '0,-420';
	$("#Bvec").value = '0.000172,0';
	$("#Bmass").value = 6000;

	$("#Cpos").value = '0,200';
	$("#Cvec").value = '-0.00023,0';
	$("#Cmass").value = 6000;

	resetSimulation();
}

function addBody(config) {
	if ( ! config) {
		config = {};
	}

	let newbody = document.createElement('div');
	newbody.innerText = config.name || String.fromCharCode('A'.charCodeAt(0) + bodies.length - 1);
	newbody.id = newbody.innerText + 'body';
	newbody.mass = config.mass || 1;
	newbody.velocity = config.velocity || new Cart2($("#Abody").velocity);
	newbody.position = config.position || new Cart2($("#Abody").position).addTo(new Cart2(0, 10));

	let tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Mass of object. This value is applied immediately';
	tmpcontrol.innerHTML = `${newbody.innerText} mass=<input type=number value=${newbody.mass} id=${newbody.innerText}mass>`;
	$("#bodiescontrols").appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start position. This value is applied when you restart';
	tmpcontrol.innerHTML = `${newbody.innerText} position=<input type=text value=${newbody.position.toString()} id=${newbody.innerText}pos>`;
	$("#bodiescontrols").appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.title = 'Start speed. This value is applied when you restart';
	tmpcontrol.innerHTML = `${newbody.innerText} vector=<input type=text value=${newbody.velocity.toString()} id=${newbody.innerText}vec>`;
	$("#bodiescontrols").appendChild(tmpcontrol);

	tmpcontrol = document.createElement('label');
	tmpcontrol.innerHTML = `${newbody.innerText} speed=<input readonly type=text id=${newbody.innerText}velocity>`;
	$("#bodiesspeeds").appendChild(tmpcontrol);

	$("#bodies").appendChild(newbody);
	bodies.push(newbody);
}

let GravityConstant = 6.6742e-11;
let FPSINDEPENDENT = false;
let STROKE = true;
let FPS = 30;
let VELOCITY_DISPLAY_CONFIG = {round: true, total: true};

let sun = $("#Sbody");
let earth = $("#Ebody");
let iss = $("#Abody");

let timeperstepfield = $("#timeperstepinput");
let canvasctx = $("canvas").getContext('2d');
let clearstrokebtn = $("#clearstroke");
let stepsperrunfield = $("#stepsperruninput");
let accelfield = $("#accelinput");
let fixedSun = false;

let arrowUp = false;
let arrowLeft = false;
let arrowRight = false;

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
	let arrowUp = false;
	let arrowLeft = false;
	let arrowRight = false;
};

document.onmousemove = function(ev) {
	mouseX = ev.clientX;
	mouseY = ev.clientY;
};

$("#scenario2btn").onclick = scenario2;

$("#addbodybtn").onclick = function() {
	addBody({
		velocity: new Cart2($("#Abody").velocity),
		position: new Cart2($("#Abody").position).addTo(new Cart2(20, 0)),
	});
};

let bodies = [sun, earth, iss];
let mouseX = 0;
let mouseY = 0;
let scale = 1e9;

/*
let framecount = 0;
let starttime = new Date().getTime();
function getfps() {
	console.log(framecount / ((new Date().getTime() - starttime) / 1000));
}
setInterval(getfps, 1000);
*/

sun.innerText = 'S';
earth.innerText = 'E';
iss.innerText = 'A';
iss.orientation = 0;

if (location.hash.length > 2) {
	loadGame(unescape(location.hash.substring(1)));
}

resetSimulation();
requestAnimationFrame(run);

