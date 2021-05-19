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

function shoottowardsmouse() {
	let distance = 15; // create the object at this distance from A
	let vel = 0.001; // speed at which you fire the shot

	let radians = Math.atan2($("#Abody").position.toPagePos().y - mouseY, mouseX - $("#Abody").position.toPagePos().x);
	let degrees = (radians * 180) / Math.PI;
	while (degrees >= 360) degrees -= 360;
	while (degrees < 0) degrees += 360;
	let config;
	addBody(config = {
		velocity: new Cart2($("#Abody").velocity).addTo(new Cart2(lengthdir_x(vel, degrees), lengthdir_y(vel, degrees))),
		position: new Cart2($("#Abody").position).addTo(new Cart2(lengthdir_x(distance, degrees), lengthdir_y(distance, degrees))),
	});
}

function resetParameters() {
	$("canvas").width = innerWidth;
	$("canvas").height = innerHeight;

	sun.position = new Cart2(parseFloat($("#Gpos").value.split(',')[0]), parseFloat($("#Gpos").value.split(',')[1]));
	sun.velocity = new Cart2(parseFloat($("#Gvec").value.split(',')[0]), parseFloat($("#Gvec").value.split(',')[1]));
	sun.mass = parseFloat($("#Gmass").value);
	sun.innerText = 'G';

	orb.position = new Cart2(parseFloat($("#Apos").value.split(',')[0]), parseFloat($("#Apos").value.split(',')[1]));
	orb.velocity = new Cart2(parseFloat($("#Avec").value.split(',')[0]), parseFloat($("#Avec").value.split(',')[1]));
	orb.mass = parseFloat($("#Amass").value);
	orb.innerHTML = 'A';
	orb.orientation = 0;

	for (let i in bodies) {
		if (bodies[i] == sun || bodies[i] == orb) {
			continue;
		}

		let name = bodies[i].innerText;
		bodies[i].position = new Cart2(parseFloat($(`#${name}pos`).value.split(',')[0]), parseFloat($(`#${name}pos`).value.split(',')[1]));
		bodies[i].velocity = new Cart2(parseFloat($(`#${name}vec`).value.split(',')[0]), parseFloat($(`#${name}vec`).value.split(',')[1]));
	}
}

function run() {
	if (arrowUp) {
		let accel = parseFloat(accelfield.value) / 1e6;
		orb.velocity.addTo(new Cart2(lengthdir_x(accel, orb.orientation - 90), lengthdir_y(accel, orb.orientation + 90)));
		orb.classList.add('boosting');
	}
	else {
		orb.classList.remove('boosting');
	}
	if (arrowLeft) {
		orb.orientation -= 4.5;
	}
	if (arrowRight) {
		orb.orientation += 4.5;
	}

	stepsperrun = parseFloat(stepsperrunfield.value);
	for (let i = 0; i < stepsperrun; i++) {
		step();
	}

	for (let i in bodies) {
		let name = bodies[i].innerText;
		bodies[i].mass = parseFloat($(`#${name}mass`).value);

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
	let deltatime = 10 * parseFloat(timeperstep.value);

	let prevpositions = {};
	for (let i in bodies) {
		prevpositions[i] = bodies[i].position.toPagePos();
	}

	for (let i in bodies) {
		for (let j in bodies) {
			if (i == j) {
				continue; // don't compute self-gravitation
			}

			if (fixedSun && bodies[i] == sun) {
				continue;
			}

			// this trig-free method does this:
			// 1. velocity += dt * radius * -GravityConstant * mass * radius.abs()^-1.5
			// 2. position += dt * velocity

			// compute radius of separation
			let radius = bodies[i].position.sub(bodies[j].position);

			// update velocity with gravitational acceleration
			bodies[i].velocity.addTo(radius.mult(deltatime * (-GravityConstant * bodies[j].mass * radius.invSumCube())));
			// update position with velocity
			bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
		}
	}

	if (STROKE) {
		for (let i in bodies) {
			let pagepos = bodies[i].position.toPagePos();
			canvas.beginPath();
			canvas.moveTo(prevpositions[i].x, prevpositions[i].y);
			if (bodies[i] == orb && arrowUp) {
				canvas.strokeStyle = `rgba(255, 0, 0, 1)`;
			}
			else {
				canvas.strokeStyle = `rgba(0, 0, 0, 0.7)`;
			}
			canvas.lineTo(pagepos.x, pagepos.y);
			canvas.stroke();
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
	$("#Gmass").value = '5e5';

	$("#Amass").value = '1';
	$("#Avec").value = '0,0.0001';

	$("#Bpos").value = '0,-420';
	$("#Bvec").value = '0.000172,0';
	$("#Bmass").value = 6000;

	$("#Cpos").value = '0,200';
	$("#Cvec").value = '-0.00023,0';
	$("#Cmass").value = 6000;

	resetParameters();
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
let VELOCITY_DISPLAY_CONFIG = {multiply: 1000000, round: true, total: true};

let sun = $("#Gbody");
let orb = $("#Abody");
let timeperstep = $("#timeperstepinput");
let stepsperrun = $("#stepsperrun");
let canvas = $("canvas").getContext('2d');
let clearstrokebtn = $("#clearstroke");
let Gmassfield = $("#Gmass");
let Amassfield = $("#Amass");
let stepsperrunfield = $("#stepsperruninput");
let accelfield = $("#accelinput");
let fixedSun = false;

let arrowUp = false;
let arrowLeft = false;
let arrowRight = false;

$("#restartbtn").onclick = resetParameters;

clearstrokebtn.onclick = function() {
	canvas.clearRect(0, 0, $("canvas").width, $("canvas").height)
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

let bodies = [sun, orb];
let mainloop = false;
let mouseX = 0;
let mouseY = 0;

/*
let framecount = 0;
let starttime = new Date().getTime();
function getfps() {
	console.log(framecount / ((new Date().getTime() - starttime) / 1000));
	framecount = 0;
	starttime = new Date().getTime();
}
setInterval(getfps, 1000);
*/

resetParameters();
requestAnimationFrame(run);

